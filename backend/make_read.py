import os
import json
import boto3
import datetime

TABLE_NAME = os.environ.get("TABLE_NAME", "LoopMind")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")

ddb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = ddb.Table(TABLE_NAME)


def resp(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "OPTIONS,POST",
        },
        "body": json.dumps(body),
    }


def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return resp(200, {"ok": True})

    try:
        body = event.get("body") or "{}"
        if isinstance(body, str):
            body = json.loads(body)

        user_id = body.get("user_id")
        alu_id = body.get("alu_id")
        node_id = body.get("node_id")

        if not all([user_id, alu_id, node_id]):
            return resp(400, {"error": "user_id, alu_id, and node_id required"})

        pk = f"USER#{user_id}"
        learn_sk = f"LEARN#{node_id}#{alu_id}"
        topic_sk = f"TOPIC#{node_id}"
        ts = now_iso()

        # Idempotent write: only increments count if it's NEW
        created = False
        try:
            table.put_item(
                Item={
                    "PK": pk,
                    "SK": learn_sk,
                    "entity_type": "LearningRecord",
                    "user_id": user_id,
                    "alu_id": alu_id,
                    "node_id": node_id,
                    "learnt_at": ts,
                },
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )
            created = True
        except Exception:
            created = False  # already learnt

        if created:
            # atomic increment
            try:
                table.update_item(
                    Key={"PK": pk, "SK": topic_sk},
                    UpdateExpression="SET learnt_count = if_not_exists(learnt_count, :z) + :one, updated_at = :u",
                    ExpressionAttributeValues={":z": 0, ":one": 1, ":u": ts},
                )
            except Exception:
                pass  # topic might not exist

        return resp(200, {
            "alu_id": alu_id,
            "node_id": node_id,
            "is_learnt": True,
            "created": created,
            "learnt_at": ts,
        })

    except Exception as e:
        return resp(500, {"error": str(e)})