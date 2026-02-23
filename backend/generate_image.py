import os
import json
import boto3
import base64
import time
import urllib.request
import urllib.error
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("TABLE_NAME", "LoopMind")
BUCKET = os.environ.get("IMAGE_BUCKET")
API_KEY = os.environ.get("GEMINI_API_KEY")

ddb = boto3.resource("dynamodb")
table = ddb.Table(TABLE_NAME)
s3 = boto3.client("s3")

VISUAL_BALANCE_RULES = (
    "Text must occupy less than 20% of the frame. "
    "Use large readable typography. "
    "Text must not dominate composition. "
    "No cluttered background text."
)

STYLE_MAP = {
    "cartoon": "high-quality cartoon illustration, expressive character, vibrant colors, clean outlines",
    "anime": "anime illustration, clean linework, cinematic lighting, detailed faces",
    "3d": "high-quality 3D render, realistic materials, studio lighting, depth of field",
    "cinematic": "cinematic digital art, photoreal lighting, shallow depth of field, film look",
    "flat_illustration": "modern flat illustration, bold shapes, clean gradients, minimal clutter",
}

HOUSE_STYLE_PREFIX = (
    "Generate a high-quality polished AI image suitable for a learning app. "
    "Do NOT add watermarks. Do NOT add logos. "
    "Square 1024x1024. Clean composition. "
)


def resp(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
        },
        "body": json.dumps(body),
    }


def extract_image_b64(gemini_json: dict) -> str:
    candidates = gemini_json.get("candidates", [])
    if not candidates:
        raise ValueError(f"No candidates: {gemini_json}")

    parts = (candidates[0].get("content") or {}).get("parts", [])
    for p in parts:
        if "inlineData" in p and "data" in p["inlineData"]:
            return p["inlineData"]["data"]
        if "inline_data" in p and "data" in p["inline_data"]:
            return p["inline_data"]["data"]
    raise ValueError(f"No inline image data found. Response: {gemini_json}")


def normalize_labels(labels):
    """
    Defensive enforcement:
    - max 3 labels
    - each label max 2 words
    - total words max 8 across all labels
    - remove question marks / punctuation that might encourage question text
    """
    if not labels:
        return []

    labels = [str(x).replace("?", "").strip() for x in labels if str(x).strip()]
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


def call_gemini_image(prompt: str) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"},
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 429:
            time.sleep(3)
            with urllib.request.urlopen(req, timeout=25) as r2:
                return json.loads(r2.read().decode("utf-8"))
        raise RuntimeError(f"Gemini HTTPError {e.code}: {body}")


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return resp(200, {"ok": True})

    try:
        if not BUCKET:
            return resp(500, {"error": "IMAGE_BUCKET env var missing"})
        if not API_KEY:
            return resp(500, {"error": "GEMINI_API_KEY env var missing"})

        if "body" in event:
            body = event.get("body") or "{}"
            if isinstance(body, str):
                body = json.loads(body)
        else:
            body = event

        user_id = body.get("user_id")
        node_id = body.get("node_id")
        alu_id = body.get("alu_id")
        if not user_id or not node_id or not alu_id:
            return resp(400, {"error": "user_id, node_id, alu_id required"})

        pk = f"USER#{user_id}"
        sk = f"ALU#{node_id}#{alu_id}"

        item = table.get_item(Key={"PK": pk, "SK": sk}).get("Item")
        if not item:
            return resp(404, {"error": "ALU not found"})

        if item.get("post_type") != "image":
            return resp(200, {"status": "skip", "reason": "not an image post"})

        if item.get("image_s3_key"):
            return resp(200, {"status": "ok", "reason": "already has image", "stored": item["image_s3_key"]})

        image_prompt = item.get("image_prompt")
        if not image_prompt:
            return resp(400, {"error": "image_prompt missing on image post"})

        style = (item.get("image_style") or "cinematic").strip().lower()
        style_hint = STYLE_MAP.get(style, STYLE_MAP["cinematic"])

        labels = normalize_labels(item.get("image_labels") or [])
        allowed = " | ".join(labels)

        text_rule = (
            f"Text allowed ONLY using these exact labels: [{allowed}]. No other text. {VISUAL_BALANCE_RULES}"
            if allowed else
            f"Use no text. {VISUAL_BALANCE_RULES}"
        )

        # Pass structured prompt directly; do not weaken structure with "Scene:"
        final_prompt = (
            f"{HOUSE_STYLE_PREFIX}"
            f"Style: {style_hint}. "
            f"{text_rule}\n\n"
            f"{image_prompt}\n"
        )

        data = call_gemini_image(final_prompt)
        img_b64 = extract_image_b64(data)
        img_bytes = base64.b64decode(img_b64)

        s3_key = f"users/{user_id}/{node_id}/{alu_id}.png"
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=img_bytes, ContentType="image/png")

        table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression="SET image_s3_key = :k",
            ExpressionAttributeValues={":k": s3_key},
        )

        all_alus = table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with(f"ALU#{node_id}#"),
        )
        image_alus = [a for a in all_alus["Items"] if a.get("post_type") == "image"]
        all_done = all(a.get("image_s3_key") for a in image_alus)

        if all_done:
            table.update_item(
                Key={"PK": f"USER#{user_id}", "SK": f"TOPIC#{node_id}"},
                UpdateExpression="SET #s = :s",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":s": "ready"},
            )

        return resp(200, {"status": "ok", "stored": s3_key, "topic_ready": bool(all_done)})

    except Exception as e:
        return resp(500, {"error": str(e)})