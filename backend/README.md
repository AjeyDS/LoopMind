# Loopmind Backend

AWS Lambda functions for the Loopmind content generation pipeline.

## Lambda Functions

- `generate_alus/` — Kicks off Step Function pipeline for content generation
- `concept-splitter/` — Splits topics into learning concepts
- `content-designer/` — Designs cards (image, quiz, flashcard) for each concept
- `asset-generator/` — Generates images and writes card data to DynamoDB
- `feed_handler/` — Serves `/feed` and `/topics` endpoints

## Infrastructure

- **API Gateway** — HTTP API (`lepwbriexl`)
- **Step Functions** — Orchestrates the generation pipeline
- **DynamoDB** — Stores topics and cards
- **S3** — Stores generated images
- **Bedrock / Gemini** — AI models for content generation
