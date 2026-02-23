import os
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("TABLE_NAME", "LoopMind")
BUCKET = os.environ.get("IMAGE_BUCKET")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")

ddb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = ddb.Table(TABLE_NAME)
s3 = boto3.client("s3", region_name=AWS_REGION)


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


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return resp(200, {"ok": True})

    try:
        if not BUCKET:
            return resp(500, {"error": "IMAGE_BUCKET env var missing"})

        qs = event.get("queryStringParameters") or {}
        user_id = qs.get("user_id")
        node_id = qs.get("node_id")

        if not user_id:
            return resp(400, {"error": "user_id required"})

        pk = f"USER#{user_id}"

        # MODE 1: list topics
        if not node_id:
            r = table.query(
                KeyConditionExpression=(Key("PK").eq(pk) & Key("SK").begins_with("TOPIC#"))
            )
            topics = []
            for it in r.get("Items", []):
                topics.append({
                    "node_id": it.get("node_id"),
                    "title": it.get("title", "Untitled"),
                    "icon": it.get("icon", "📚"),
                    "status": it.get("status", "ready"),
                    "card_count": it.get("card_count", 0),
                    "learnt_count": it.get("learnt_count", 0),
                    "created_at": it.get("created_at"),
                })

            topics.sort(key=lambda x: x.get("created_at") or "", reverse=True)
            return resp(200, {"topics": topics})

        # MODE 2: topic + cards
        topic_item = table.get_item(Key={"PK": pk, "SK": f"TOPIC#{node_id}"}).get("Item", {})

        r = table.query(
            KeyConditionExpression=(Key("PK").eq(pk) & Key("SK").begins_with(f"ALU#{node_id}#"))
        )
        alu_items = r.get("Items", [])

        # ✅ Efficient: only learnt for this node
        learn_r = table.query(
            KeyConditionExpression=(Key("PK").eq(pk) & Key("SK").begins_with(f"LEARN#{node_id}#"))
        )
        learnt_ids = set(it.get("alu_id") for it in learn_r.get("Items", []) if it.get("alu_id"))

        cards = []
        for it in alu_items:
            img_url = None
            key = it.get("image_s3_key")
            if key:
                img_url = s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": BUCKET, "Key": key},
                    ExpiresIn=3600,
                )

            cards.append({
                "alu_id": it.get("alu_id"),
                "node_id": it.get("node_id"),
                "order": it.get("order", 0),
                "title": it.get("title"),
                "hook": it.get("hook"),
                "post_type": it.get("post_type"),
                "micro_explanation": it.get("micro_explanation", []),
                "flashcard": it.get("flashcard"),
                "quiz": it.get("quiz"),
                "image_url": img_url,
                "image_style": it.get("image_style"),
                "takeaways": it.get("takeaways", []),
                "mastery_question": it.get("mastery_question"),
                "is_learnt": it.get("alu_id") in learnt_ids,
                "created_at": it.get("created_at"),
            })

        cards.sort(key=lambda x: x.get("order") or 0)

        return resp(200, {
            "topic": {
                "node_id": node_id,
                "title": topic_item.get("title", "Untitled"),
                "icon": topic_item.get("icon", "📚"),
                "status": topic_item.get("status", "ready"),
                "card_count": topic_item.get("card_count", len(cards)),
                "learnt_count": topic_item.get("learnt_count", len(learnt_ids)),
            },
            "cards": cards,
        })

    except Exception as e:
        return resp(500, {"error": str(e)})