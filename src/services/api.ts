import {
    Card, Topic, BackendTopicItem, BackendALU,
} from '../types';

// ─── Config ─────────────────────────────────────────────────────────────
const API_URL = 'https://lepwbriexl.execute-api.us-east-2.amazonaws.com';
const GENERATE_URL = 'https://g4jtcoqlwnraha33r4ztsyxole0govag.lambda-url.us-east-2.on.aws';
const USER_ID = 'u1'; // hardcoded for hackathon — replace with Cognito later

// ─── Fetch with timeout ─────────────────────────────────────────────────
function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> {
    return Promise.race([
        fetch(url, options),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        ),
    ]);
}

// ─── Colour palette for auto-assigned topic colours ─────────────────────
const TOPIC_COLORS = [
    '#6C63FF', '#FF6B6B', '#F7B731', '#26de81',
    '#FC5C7D', '#45B7D1', '#F78FB3', '#7158E2',
];

const TOPIC_EMOJIS = ['🧠', '📘', '🔬', '⚡', '🎓', '💡', '🌟', '🚀'];

function pickColor(index: number): string {
    return TOPIC_COLORS[index % TOPIC_COLORS.length];
}

function pickEmoji(index: number): string {
    return TOPIC_EMOJIS[index % TOPIC_EMOJIS.length];
}

// ─── Mappers ────────────────────────────────────────────────────────────

/** Map a backend ALU item to our frontend Card union type */
function mapALUToCard(alu: BackendALU): Card | null {
    const baseId = alu.alu_id;
    const postType = alu.post_type ?? alu.card_type;

    switch (postType) {
        case 'image': {
            // caption comes from micro_explanation array joined
            const caption = alu.caption
                ?? (Array.isArray(alu.micro_explanation)
                    ? alu.micro_explanation.join(' ')
                    : '');
            return {
                id: baseId,
                card_type: 'image',
                imageUrl: alu.image_url ?? '',
                caption,
                hook: alu.hook ?? '',
                credit: alu.credit,
            };
        }
        case 'quiz': {
            // Backend sends quiz as nested object: { question, choices, answer_index, explanation }
            const quiz = alu.quiz ?? {};
            const choices: string[] = quiz.choices ?? [];
            const options = choices.map((text: string, i: number) => ({
                id: String(i),
                text,
            }));
            return {
                id: baseId,
                card_type: 'quiz',
                question: quiz.question ?? alu.question ?? '',
                options,
                correctOptionId: String(quiz.answer_index ?? 0),
                explanation: quiz.explanation ?? alu.explanation ?? '',
            };
        }
        case 'flashcard': {
            // Backend sends flashcard as {"Question text": "Answer text"} (single key-value)
            let front = alu.front ?? '';
            let back = alu.back ?? '';

            if (alu.flashcard && typeof alu.flashcard === 'object') {
                const entries = Object.entries(alu.flashcard);
                if (entries.length > 0) {
                    front = entries[0][0];   // key = question
                    back = entries[0][1] as string;  // value = answer
                }
            }

            return {
                id: baseId,
                card_type: 'flashcard',
                front,
                back,
                hint: alu.hint,
            };
        }
        default:
            console.warn(`[api] Unknown card_type: ${postType}`);
            return null;
    }
}

/** Check if a backend status string means "ready" */
function isReadyStatus(status?: string): boolean {
    if (!status) return false;
    const s = status.toLowerCase().trim();
    return ['ready', 'completed', 'done', 'complete', 'finished', 'images_pending'].includes(s);
}

/** Check if a generating topic is stuck (created > 10 min ago with 0 cards) */
function isStuckGenerating(item: BackendTopicItem): boolean {
    if (isReadyStatus(item.status)) return false;
    if ((item.card_count ?? 0) > 0) return false;
    if (!item.created_at) return false;
    const createdMs = new Date(item.created_at).getTime();
    const ageMs = Date.now() - createdMs;
    return ageMs > 10 * 60 * 1000; // stuck if > 10 minutes old
}

/** Map a backend topic item to our frontend Topic type */
function mapBackendTopic(item: BackendTopicItem, index: number): Topic {
    const stuck = isStuckGenerating(item);
    console.log(`[api] topic "${item.title}" → status: "${item.status}", icon: "${item.icon}", card_count: ${item.card_count}${stuck ? ' (STUCK)' : ''}`);
    return {
        id: item.node_id,
        title: item.title ?? 'Untitled',
        emoji: item.icon ?? pickEmoji(index),
        color: pickColor(index),
        status: isReadyStatus(item.status) ? 'ready' : 'generating',
        depth: 'intermediate', // backend doesn't track depth; default
        cardCount: item.card_count ?? 0,
        cards: [],
        stuck,
    };
}

// ─── API ────────────────────────────────────────────────────────────────
export const api = {
    /**
     * List all topics for the current user.
     * GET /topics?user_id=u1
     */
    async getTopics(): Promise<Topic[]> {
        try {
            const res = await fetchWithTimeout(`${API_URL}/feed?user_id=${USER_ID}`);
            const data = await res.json();
            console.log('[api] getTopics raw response:', JSON.stringify(data).slice(0, 500));

            // The backend may return { topics: [...] } or { nodes: [...] } or a raw array
            const items: BackendTopicItem[] = Array.isArray(data)
                ? data
                : data.topics ?? data.nodes ?? data.items ?? data.feed ?? [];

            console.log(`[api] getTopics parsed ${items.length} topics`);
            return items.map(mapBackendTopic);
        } catch (err) {
            console.warn('[api] getTopics failed:', err);
            return [];
        }
    },

    /**
     * Get cards for a specific topic.
     * GET /topics/{nodeId}?user_id=u1
     */
    async getCards(nodeId: string): Promise<Card[]> {
        try {
            const res = await fetchWithTimeout(
                `${API_URL}/feed?user_id=${USER_ID}&node_id=${nodeId}`
            );
            const data = await res.json();

            // Backend may return { cards: [...] } or { alus: [...] } or raw array
            const alus: BackendALU[] = Array.isArray(data)
                ? data
                : data.cards ?? data.alus ?? data.items ?? [];

            return alus
                .map(mapALUToCard)
                .filter((c): c is Card => c !== null);
        } catch (err) {
            console.warn('[api] getCards failed:', err);
            return [];
        }
    },

    /**
     * Kick off content generation for a new topic.
     * POST /generate
     */
    async generateTopic(
        title: string,
        rawText: string = '',
        nodeId?: string,
    ): Promise<{ node_id: string;[key: string]: any }> {
        const id = nodeId ?? `node-${Date.now()}`;

        // True fire-and-forget: send the request and don't wait for a
        // response at all.  API Gateway has a 29 s hard cap and the Lambda
        // takes 60 s+, so the gateway will always 504.  We don't need the
        // response — the caller polls /feed until the topic is ready.
        fetch(GENERATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: USER_ID,
                node_id: id,
                title,
                raw_text: rawText || `Tell me about ${title}`,
            }),
        })
            .then((res) => res.json())
            .then((data) => console.log('[api] generateTopic response:', JSON.stringify(data)))
            .catch(() => console.log('[api] generateTopic request timed out (expected). Generation continues on backend.'));

        return { node_id: id };
    },

    /**
     * Mark a card as learnt.
     * POST /learn
     */
    async markLearnt(aluId: string, nodeId: string): Promise<any> {
        try {
            const res = await fetchWithTimeout(`${API_URL}/learn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: USER_ID,
                    alu_id: aluId,
                    node_id: nodeId,
                }),
            });
            return await res.json();
        } catch (err) {
            console.warn('[api] markLearnt failed:', err);
            return {};
        }
    },

    /**
     * Poll until a topic is ready by re-fetching the topics list.
     * Returns the status of the specified topic.
     */
    async pollTopicStatus(
        nodeId: string
    ): Promise<'ready' | 'generating'> {
        try {
            const topics = await this.getTopics();
            const found = topics.find((t) => t.id === nodeId);
            return found?.status ?? 'generating';
        } catch {
            return 'generating';
        }
    },

    /**
     * Delete a topic and all its cards.
     * POST /delete
     */
    async deleteTopic(nodeId: string): Promise<any> {
        try {
            const res = await fetchWithTimeout(`${API_URL}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: USER_ID,
                    node_id: nodeId,
                }),
            });
            return await res.json();
        } catch (err) {
            console.warn('[api] deleteTopic failed:', err);
            return {};
        }
    },
};
