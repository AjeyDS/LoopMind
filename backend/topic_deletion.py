import os
import json
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ.get("TABLE_NAME", "LoopMind")
ddb = boto3.resource("dynamodb")
table = ddb.Table(TABLE_NAME)


def resp(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "OPTIONS,POST,DELETE",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return resp(200, {"ok": True})

    try:
        body = event.get("body") or "{}"
        if isinstance(body, str):
            body = json.loads(body)

        user_id = body.get("user_id")
        node_id = body.get("node_id")

        if not user_id or not node_id:
            return resp(400, {"error": "user_id and node_id required"})

        # 1. Delete Topic record
        table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"TOPIC#{node_id}"})

        # 2. Delete all ALU cards for this topic
        alus = table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{user_id}")
                & Key("SK").begins_with(f"ALU#{node_id}#")
            ),
        )
        for item in alus.get("Items", []):
            table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})

        # 3. Delete all LEARN records for this topic
        learns = table.query(
            KeyConditionExpression=(
                Key("PK").eq(f"USER#{user_id}")
                & Key("SK").begins_with("LEARN#")
            ),
        )
        for item in learns.get("Items", []):
            if item.get("node_id") == node_id:
                table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})

        return resp(200, {
            "status": "deleted",
            "node_id": node_id,
        })

    except Exception as e:
        return resp(500, {"error": str(e)})