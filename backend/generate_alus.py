import os
import json
import uuid
import random
import datetime
import boto3
import re
from botocore.exceptions import ClientError
from decimal import Decimal

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────
TABLE_NAME = os.environ.get("TABLE_NAME", "LoopMind")
MODEL_ID = os.environ.get("MODEL_ID")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")

MAX_IMAGES = int(os.environ.get("MAX_IMAGES", "3"))
ALU_MIN = int(os.environ.get("ALU_MIN", "8"))
ALU_MAX = int(os.environ.get("ALU_MAX", "15"))

GENERATE_IMAGE_FN = os.environ.get("GENERATE_IMAGE_FN", "generate_image")

ddb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = ddb.Table(TABLE_NAME)

brt = boto3.client("bedrock-runtime", region_name=AWS_REGION)
lambda_client = boto3.client("lambda", region_name=AWS_REGION)

# ─────────────────────────────────────────────────────────────
# Guardrails (Structured prompt + Text density)
# ─────────────────────────────────────────────────────────────
STRUCT_FIELDS = [
    "Subject:",
    "Context/Environment:",
    "Style:",
    "Lighting:",
    "Camera:",
    "Mood:",
    "Color palette:",
    "Text in image:",
    "Quality modifiers:",
]

VISUAL_BALANCE_RULES = (
    "Text must occupy less than 20% of the frame. "
    "Use large readable typography. "
    "Text must not dominate composition. "
    "No cluttered background text."
)

POSTER_KEYWORDS = [
    "poster", "quote", "ad", "advertisement", "flyer", "banner",
    "thumbnail", "cover", "title card", "logo", "branding"
]


def wants_text_in_image(raw_text: str, title: str) -> bool:
    t = f"{title or ''} {raw_text or ''}".lower()
    return any(k in t for k in POSTER_KEYWORDS)


def validate_structured_prompt(p: str) -> bool:
    if not p:
        return False
    return all(f in p for f in STRUCT_FIELDS)


def normalize_labels(labels):
    """
    Enforce:
    - max 3 labels
    - each label max 2 words
    - total words max 8 across all labels
    """
    if not labels:
        return []

    labels = [str(x).strip() for x in labels if str(x).strip()]
    labels = labels[:3]

    cleaned = []
    for lab in labels:
        words = lab.split()
        cleaned.append(" ".join(words[:2]))

    all_words = " ".join(cleaned).split()
    if len(all_words) > 8:
        all_words = all_words[:8]
        rebuilt = []
        i = 0
        while i < len(all_words) and len(rebuilt) < 3:
            rebuilt.append(" ".join(all_words[i:i+2]))
            i += 2
        cleaned = rebuilt

    out = []
    seen = set()
    for lab in cleaned:
        lab = lab.strip()
        if lab and lab.lower() not in seen:
            out.append(lab)
            seen.add(lab.lower())

    return out[:3]


def build_structured_image_prompt(title: str, image_style: str, labels: list) -> str:
    """
    Build a strict structured prompt even if the model drifted.
    """
    text_line = "None" if not labels else " | ".join(labels)

    return (
        f"Subject: {title or 'A clear scene that teaches the concept'}\n"
        f"Context/Environment: Real-world, visually clear setting\n"
        f"Style: {image_style or 'cinematic'}\n"
        f"Lighting: Natural, well-balanced lighting\n"
        f"Camera: Square, mobile-friendly composition, clear subject framing\n"
        f"Mood: Engaging and easy to understand\n"
        f"Color palette: Clean, high-contrast but not oversaturated\n"
        f"Text in image: {text_line}\n"
        f"Quality modifiers: High resolution, sharp focus, no watermark, no logo, {VISUAL_BALANCE_RULES}\n"
    )


def enforce_image_prompt_guardrails(cards: list, allow_text: bool) -> list:
    """
    Enforce BOTH:
    1) image_prompt structured format
    2) text density (labels) rules
    """
    for c in cards:
        if c.get("post_type") != "image":
            continue

        labels = c.get("image_labels") or []
        if not allow_text:
            labels = []
        else:
            labels = normalize_labels(labels)

        c["image_labels"] = labels if labels else None

        ip = c.get("image_prompt") or ""
        if not validate_structured_prompt(ip):
            c["image_prompt"] = build_structured_image_prompt(
                title=c.get("title", ""),
                image_style=c.get("image_style"),
                labels=labels
            )
            continue

        desired_text = "None" if not labels else " | ".join(labels)
        ip = re.sub(r"(Text in image:\s*).*$", r"\1" + desired_text, ip, flags=re.MULTILINE)

        if "Text must occupy less than 20% of the frame" not in ip:
            ip = ip.rstrip() + f"\nQuality modifiers: High resolution, sharp focus, no watermark, no logo, {VISUAL_BALANCE_RULES}\n"

        c["image_prompt"] = ip

    return cards


# ─────────────────────────────────────────────────────────────
# NEW Guardrail: Image hooks must be STATEMENTS (no questions)
# ─────────────────────────────────────────────────────────────
def _title_case_statement(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return s
    # Light normalization: remove trailing punctuation
    s = s.rstrip("?.! ")
    # Capitalize first character, keep rest as-is
    return s[0].upper() + s[1:]


def enforce_image_hook_statement(cards: list) -> list:
    """
    For post_type=image:
    - hook must NOT be a question
    - hook must be <= 12 words (already a rule, but we enforce)
    Strategy:
    - If hook contains '?', convert into a statement.
    - Also strip leading question starters like Why/How/What/When/Where/Is/Are/Can/Do/Does.
    - If hook is empty or still bad, fallback to: "The difference between X and Y" style from title.
    """
    q_starters = ("why", "how", "what", "when", "where", "is", "are", "can", "do", "does", "did", "should", "could", "would")

    for c in cards:
        if c.get("post_type") != "image":
            continue

        hook = (c.get("hook") or "").strip()
        title = (c.get("title") or "").strip()

        # If hook is empty, make one from title
        if not hook:
            hook = title or "Key idea explained"

        # Remove question mark & common question phrasing
        hook = hook.replace("?", "").strip()

        # Remove leading question starter word if present
        parts = hook.split()
        if parts and parts[0].lower() in q_starters:
            hook = " ".join(parts[1:]).strip()

        # If it became empty after stripping
        if not hook:
            hook = title or "Key idea explained"

        hook = _title_case_statement(hook)

        # Enforce <= 12 words (truncate safely)
        words = hook.split()
        if len(words) > 12:
            hook = " ".join(words[:12])

        c["hook"] = hook

    return cards


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def json_default(o):
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError(f"Type not serializable: {type(o)}")


def resp(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
        },
        "body": json.dumps(body, default=json_default),
    }


def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def invoke_claude(prompt: str, max_tokens: int = 3000, temperature: float = 0.35) -> str:
    if not MODEL_ID:
        raise ValueError("MODEL_ID env var missing")

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }

    try:
        r = brt.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(body).encode("utf-8"),
            contentType="application/json",
            accept="application/json",
        )
        raw = r["body"].read().decode("utf-8")
        data = json.loads(raw)
        return "".join([c.get("text", "") for c in data.get("content", [])])
    except ClientError as e:
        raise RuntimeError(f"Bedrock invoke failed: {e}")


def parse_json(text: str):
    """
    Best-effort JSON extraction (array or object), with repair fallback.
    """
    text = (text or "").strip()

    s = text.find("[")
    e = text.rfind("]")
    if s != -1 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except json.JSONDecodeError:
            pass

    s = text.find("{")
    e = text.rfind("}")
    if s != -1 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except json.JSONDecodeError:
            pass

    fix_prompt = (
        "Fix the following into STRICTLY VALID JSON. "
        "Return ONLY the corrected JSON. No markdown. No commentary.\n\n"
        f"{text}"
    )
    fixed = invoke_claude(fix_prompt, max_tokens=2500, temperature=0.1).strip()
    s = fixed.find("[") if "[" in fixed else fixed.find("{")
    e = fixed.rfind("]") if "]" in fixed else fixed.rfind("}")
    if s != -1 and e > s:
        return json.loads(fixed[s:e + 1])

    raise ValueError("Could not parse model output as JSON")


def pick_icon(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in ["heart", "cardio", "cholesterol", "blood pressure", "fitness", "exercise", "workout", "gym"]): return "❤️"
    if any(w in t for w in ["diet", "food", "nutrition", "recipe", "protein", "calories"]): return "🥗"
    if any(w in t for w in ["code", "python", "react", "sql", "javascript", "software"]): return "💻"
    if any(w in t for w in ["math", "algebra", "statistics", "probability"]): return "📐"
    if any(w in t for w in ["science", "physics", "chemistry", "biology"]): return "🔬"
    if any(w in t for w in ["business", "marketing", "finance", "economy", "money", "budget"]): return "📈"
    if any(w in t for w in ["psychology", "brain", "mind", "habits"]): return "🧠"
    if any(w in t for w in ["aws", "cloud", "devops", "lambda", "dynamodb"]): return "☁️"
    if any(w in t for w in ["machine learning", "ai", "neural", "llm"]): return "🤖"
    return "📚"


# ─────────────────────────────────────────────────────────────
# Count selection (avoid always 8)
# ─────────────────────────────────────────────────────────────
def choose_target_count(raw_text: str) -> int:
    """
    8–15, biased by length + slight jitter so it doesn't always stick to min.
    Also nudges up a bit for very short prompts so output still feels rich.
    """
    L = len((raw_text or "").strip())
    if L < 120:
        base = 10
    elif L < 400:
        base = 9
    else:
        base = ALU_MIN + min(ALU_MAX - ALU_MIN, L // 2500)

    jitter = random.choice([0, 0, 1, 1, 2])
    return max(ALU_MIN, min(ALU_MAX, base + jitter))


# ─────────────────────────────────────────────────────────────
# PASS 1 — Concepts
# ─────────────────────────────────────────────────────────────
def pass1_extract_concepts(raw_text: str, target_n: int) -> list:
    prompt = f"""
Extract EXACTLY {target_n} important concepts from the content.

VERY IMPORTANT:
- If the input is short or just a simple question (example: "How to keep heart healthy?"),
  you MUST expand it into practical, real-life actionable subtopics.
- Make concepts practical: habits, routines, common mistakes, myths, examples, checklists.

Rules:
- Output MUST be a JSON array of EXACTLY {target_n} items.
- Each item is ONE atomic concept.
- Order them logically (foundation -> habits -> advanced -> mistakes -> optimization).
- No overlap or duplicates.

Return ONLY JSON array. No markdown. No extra text.

Each item:
{{
  "order": 1,
  "title": "Clear actionable concept",
  "key_insight": "1-2 practical sentences",
  "importance": "why this matters in real life"
}}

CONTENT:
\"\"\"{raw_text[:12000]}\"\"\"
""".strip()

    out = invoke_claude(prompt, max_tokens=2600, temperature=0.35)
    concepts = parse_json(out)

    if not isinstance(concepts, list) or len(concepts) != target_n:
        fix_prompt = f"""Fix to a JSON array of EXACTLY {target_n} items with the same schema.
Return ONLY JSON array.

DRAFT:
{json.dumps(concepts)}
"""
        concepts = parse_json(invoke_claude(fix_prompt, max_tokens=2200, temperature=0.2))

    if not isinstance(concepts, list) or len(concepts) != target_n:
        raise ValueError(f"Concept extraction returned {len(concepts) if isinstance(concepts, list) else 'non-list'}; expected {target_n}")

    for i, c in enumerate(concepts):
        c["order"] = i + 1
    return concepts


# ─────────────────────────────────────────────────────────────
# PASS 2 — Cards (adds structured image_prompt + statement hooks)
# ─────────────────────────────────────────────────────────────
def pass2_design_cards(concepts: list, target_n: int, topic_hint: str, allow_text: bool) -> list:
    concepts_json = json.dumps(concepts, indent=2)

    text_policy = (
        "Text in image is allowed ONLY if truly necessary (poster/quote/ad intent)."
        if allow_text else
        "Text in image MUST be None (no text)."
    )

    prompt = f"""
Return STRICT JSON array of EXACTLY {target_n} cards. No markdown. No extra text.
First character MUST be [ and last MUST be ].

Allowed post_type: image | flashcard | quiz

GLOBAL RULES:
- At least 1 image, 1 flashcard, 1 quiz
- At most {MAX_IMAGES} images
- Variety matters (don’t make everything the same type)

HOOK RULES (STRICT):
- hook: <= 12 words
- For post_type="image": hook MUST be a clear STATEMENT, NOT a question.
  (No question marks. Do not start with Why/How/What/When/Where/Is/Are/Can/Do/Does.)
- For post_type="flashcard" and "quiz": hook can be any style.

micro_explanation: EXACTLY 2 short sentences
takeaways: EXACTLY 3 strings (<=12 words each)

FLASHCARD RULE (STRICT):
- If post_type='flashcard': flashcard must be exactly one key-value pair: {{"Question":"Answer"}}
- Else flashcard = null

QUIZ RULE:
- If post_type='quiz': quiz must be an object:
  {{"question":"...","choices":["A","B","C","D"],"answer_index":0,"explanation":"1-2 sentences"}}
- Else quiz = null

VISUAL STRUCTURE (required on ALL cards):
- visual_type must be one of: comparison | before_after | diagram | step_breakdown | mental_model
- visual_payload must be an object that matches visual_type (keep it simple and clean)

HARD IMAGE RULES:
- Image posts MUST be visually interesting and scene-based whenever possible.
- Prefer: humans in action, characters, realistic objects, lifestyle scenes, before/after contrasts.
- Only use anatomical diagrams if absolutely required.

{text_policy}

TEXT DENSITY RULES (STRICT):
- Default: Text in image: None
- If text is included:
  * Max 8 words TOTAL in the entire image text
  * Max 3 labels
  * Each label max 2 words
- Use ONLY the exact words in image_labels. Do NOT invent other text.

image_style must be one of:
cartoon | anime | 3d | cinematic | flat_illustration

STRUCTURED IMAGE PROMPT FORMAT (STRICT):
If post_type="image", image_prompt MUST be a multiline string with EXACTLY these lines (in this order):
Subject:
Context/Environment:
Style:
Lighting:
Camera:
Mood:
Color palette:
Text in image:
Quality modifiers:

And:
- "Text in image:" must be "None" or match image_labels.
- "Quality modifiers:" MUST include: {VISUAL_BALANCE_RULES}
- Must explicitly include one of: a human, a character, or a real object (unless impossible).
- Must be square, mobile-friendly, high quality.

OUTPUT SCHEMA (every card must include these keys):
title, hook, post_type, micro_explanation,
flashcard, quiz,
visual_type, visual_payload,
image_style, image_labels, image_prompt,
takeaways, mastery_question.

UNUSED FIELDS must be null (example: if not image => image_prompt/image_style/image_labels null).

TOPIC HINT:
{topic_hint}

CONCEPTS (1 concept => 1 card, same order):
{concepts_json}
""".strip()

    out = invoke_claude(prompt, max_tokens=4200, temperature=0.35)
    cards = parse_json(out)

    if not isinstance(cards, list) or len(cards) != target_n:
        fix_prompt = f"""Fix to EXACTLY {target_n} cards. Keep schema and all rules. Return ONLY JSON array.

TOPIC HINT:
{topic_hint}

CONCEPTS:
{json.dumps(concepts)}

DRAFT:
{json.dumps(cards)}
"""
        cards = parse_json(invoke_claude(fix_prompt, max_tokens=4200, temperature=0.25))

    if not isinstance(cards, list) or len(cards) != target_n:
        raise ValueError(f"Cards returned {len(cards) if isinstance(cards, list) else 'non-list'}; expected {target_n}")

    return cards


# ─────────────────────────────────────────────────────────────
# Enforcement
# ─────────────────────────────────────────────────────────────
def enforce_constraints(cards: list) -> list:
    # Cap images
    img_count = 0
    for c in cards:
        if c.get("post_type") == "image":
            img_count += 1
            if img_count > MAX_IMAGES:
                c["post_type"] = "flashcard"
                c["image_prompt"] = None
                c["image_style"] = None
                c["image_labels"] = None
                title = c.get("title", "Key concept")
                me = c.get("micro_explanation", [])
                ans = me[0] if isinstance(me, list) and me else "See explanation."
                c["flashcard"] = {f"What is {title}?": str(ans)[:200]}
                c["quiz"] = None

    def has(t):
        return any(x.get("post_type") == t for x in cards)

    # Ensure quiz
    if not has("quiz"):
        c = cards[-1]
        c["post_type"] = "quiz"
        c["quiz"] = {
            "question": c.get("mastery_question") or f"What is important about {c.get('title','this concept')}?",
            "choices": ["Option A", "Option B", "Option C", "Option D"],
            "answer_index": 0,
            "explanation": "Choose the best answer based on the concept."
        }
        c["flashcard"] = None
        c["image_prompt"] = None
        c["image_style"] = None
        c["image_labels"] = None

    # Ensure image
    if not has("image"):
        for c in cards:
            if c.get("post_type") == "flashcard":
                c["post_type"] = "image"
                c["image_style"] = "cinematic"
                c["image_labels"] = None
                c["image_prompt"] = build_structured_image_prompt(
                    title=c.get("title", ""),
                    image_style=c.get("image_style"),
                    labels=[]
                )
                c["flashcard"] = None
                c["quiz"] = None
                break

    # Ensure flashcard
    if not has("flashcard"):
        for c in cards:
            if c.get("post_type") == "image":
                c["post_type"] = "flashcard"
                title = c.get("title", "Key idea")
                me = c.get("micro_explanation", [])
                ans = me[0] if isinstance(me, list) and me else "Short, clear answer."
                c["flashcard"] = {f"What is {title}?": str(ans)[:200]}
                c["image_prompt"] = None
                c["image_style"] = None
                c["image_labels"] = None
                c["quiz"] = None
                break

    # Strict nulling
    for c in cards:
        if c.get("post_type") != "image":
            c["image_prompt"] = None
            c["image_style"] = None
            c["image_labels"] = None
        if c.get("post_type") != "flashcard":
            c["flashcard"] = None
        if c.get("post_type") != "quiz":
            c["quiz"] = None

        c.setdefault("hook", "")
        c.setdefault("title", "")
        c.setdefault("micro_explanation", [])
        c.setdefault("takeaways", [])
        c.setdefault("mastery_question", "")
        c.setdefault("visual_type", "diagram")
        c.setdefault("visual_payload", {})

    return cards


def invoke_images_async(image_jobs: list):
    for job in image_jobs:
        try:
            lambda_client.invoke(
                FunctionName=GENERATE_IMAGE_FN,
                InvocationType="Event",
                Payload=json.dumps(job).encode("utf-8"),
            )
        except Exception as e:
            print(f"Async image invoke failed for alu_id={job.get('alu_id')}: {e}")


# ─────────────────────────────────────────────────────────────
# Main handler
# ─────────────────────────────────────────────────────────────
def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return resp(200, {"ok": True})

    user_id = None
    node_id = None

    try:
        body = event.get("body") or "{}"
        if isinstance(body, str):
            body = json.loads(body)

        user_id = body.get("user_id")
        raw_text = (body.get("raw_text") or "").strip()
        title = (body.get("title") or "").strip()

        if not user_id:
            return resp(400, {"error": "user_id required"})
        if not raw_text:
            return resp(400, {"error": "raw_text required"})

        node_id = body.get("node_id") or uuid.uuid4().hex[:12]

        if not title:
            title = raw_text.split("\n")[0].strip()
            if len(title) > 60:
                title = title[:57] + "..."

        raw_text = raw_text[:12000]
        ts = now_iso()

        table.put_item(Item={
            "PK": f"USER#{user_id}",
            "SK": f"TOPIC#{node_id}",
            "entity_type": "Topic",
            "user_id": user_id,
            "node_id": node_id,
            "title": title,
            "status": "generating",
            "card_count": 0,
            "learnt_count": 0,
            "icon": pick_icon(title or raw_text),
            "created_at": ts,
            "updated_at": ts,
        })

        target_n = choose_target_count(raw_text)

        topic_hint = (
            f"User topic: {title or raw_text[:80]}\n"
            "If topic is health/fitness/habits/productivity/finance: prefer humans in action + real objects.\n"
            "Avoid boring textbook diagrams unless absolutely required.\n"
        )

        allow_text = wants_text_in_image(raw_text, title)

        concepts = pass1_extract_concepts(raw_text, target_n)
        cards = pass2_design_cards(concepts, target_n, topic_hint=topic_hint, allow_text=allow_text)

        cards = enforce_constraints(cards)
        cards = enforce_image_prompt_guardrails(cards, allow_text)
        cards = enforce_image_hook_statement(cards)  # NEW: statement hooks for image posts

        items = []
        image_jobs = []

        for i, card in enumerate(cards):
            alu_id = uuid.uuid4().hex[:12]
            order = i + 1

            items.append({
                "PK": f"USER#{user_id}",
                "SK": f"ALU#{node_id}#{alu_id}",
                "entity_type": "ALU",
                "user_id": user_id,
                "node_id": node_id,
                "alu_id": alu_id,
                "order": order,
                "title": card.get("title", ""),
                "hook": card.get("hook", ""),
                "post_type": card.get("post_type", "flashcard"),
                "micro_explanation": card.get("micro_explanation", []),
                "flashcard": card.get("flashcard"),
                "quiz": card.get("quiz"),
                "visual_type": card.get("visual_type", "diagram"),
                "visual_payload": card.get("visual_payload", {}),
                "image_style": card.get("image_style"),
                "image_labels": card.get("image_labels"),
                "image_prompt": card.get("image_prompt"),
                "image_s3_key": None,
                "takeaways": card.get("takeaways", []),
                "mastery_question": card.get("mastery_question", ""),
                "created_at": ts,
            })

            if card.get("post_type") == "image" and card.get("image_prompt"):
                image_jobs.append({"user_id": user_id, "node_id": node_id, "alu_id": alu_id})

        with table.batch_writer() as batch:
            for it in items:
                batch.put_item(Item=it)

        table.update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"TOPIC#{node_id}"},
            UpdateExpression="SET #s = :s, card_count = :c, updated_at = :u",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "images_pending" if image_jobs else "ready",
                ":c": len(items),
                ":u": now_iso(),
            },
        )

        if image_jobs:
            invoke_images_async(image_jobs)

        return resp(200, {
            "status": "ok",
            "node_id": node_id,
            "title": title,
            "icon": pick_icon(title or raw_text),
            "created": len(items),
            "images_pending": len(image_jobs),
            "card_summary": {
                "image": sum(1 for c in cards if c.get("post_type") == "image"),
                "quiz": sum(1 for c in cards if c.get("post_type") == "quiz"),
                "flashcard": sum(1 for c in cards if c.get("post_type") == "flashcard"),
                "total": len(cards),
            }
        })

    except Exception as e:
        try:
            if user_id and node_id:
                table.update_item(
                    Key={"PK": f"USER#{user_id}", "SK": f"TOPIC#{node_id}"},
                    UpdateExpression="SET #s = :s, updated_at = :u",
                    ExpressionAttributeNames={"#s": "status"},
                    ExpressionAttributeValues={":s": "error", ":u": now_iso()},
                )
        except Exception:
            pass
        return resp(500, {"error": str(e)})