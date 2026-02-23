// ─── Core domain types ────────────────────────────────────────────────
export type CardType = 'image' | 'quiz' | 'flashcard';
export type TopicStatus = 'ready' | 'generating';
export type Depth = 'beginner' | 'intermediate' | 'advanced';

export interface ImageCardData {
    id: string;
    card_type: 'image';
    imageUrl: string;
    caption: string;
    hook?: string;
    credit?: string;
}

export interface QuizOption {
    id: string;
    text: string;
}

export interface QuizCardData {
    id: string;
    card_type: 'quiz';
    question: string;
    options: QuizOption[];
    correctOptionId: string;
    explanation: string;
}

export interface FlashCardData {
    id: string;
    card_type: 'flashcard';
    front: string;
    back: string;
    hint?: string;
}

export type Card = ImageCardData | QuizCardData | FlashCardData;

export interface Topic {
    id: string;
    title: string;
    emoji: string;
    color: string;       // accent color hex
    status: TopicStatus;
    depth: Depth;
    cardCount: number;
    cards: Card[];
}

// ─── Auth ─────────────────────────────────────────────────────────────
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
}

// ─── API request / response types ─────────────────────────────────────
export interface GenerateTopicRequest {
    title: string;
    rawText?: string;  // raw study material text (optional)
    depth: Depth;
}

export interface GenerateTopicResponse {
    topic: Topic;
}

// ─── Backend response shapes (from DynamoDB / API Gateway) ────────────
export interface BackendTopicItem {
    node_id: string;
    title: string;
    icon?: string;
    status?: string;
    card_count?: number;
    learnt_count?: number;
    created_at?: string;
    [key: string]: any;  // additional fields the backend may include
}

export interface BackendALU {
    alu_id: string;
    node_id: string;
    card_type: string;      // 'image' | 'quiz' | 'flashcard'
    // image card fields
    image_url?: string;
    caption?: string;
    credit?: string;
    // quiz card fields
    question?: string;
    options?: { id: string; text: string }[];
    correct_option_id?: string;
    explanation?: string;
    // flashcard fields
    front?: string;
    back?: string;
    hint?: string;
    // metadata
    learnt?: boolean;
    [key: string]: any;
}
