# LoopMind 🧠
### Learn anything visually, one card at a time

LoopMind transforms any topic into a scrollable feed of AI-generated learning cards — 
image cards, quizzes, and flashcards — designed using cognitive science principles 
(Picture Superiority Effect, Mayer's Multimedia Learning, Spaced Repetition).

## How It Works
1. Type any topic → "Creatine for muscle building"
2. AI breaks it into 8-15 key concepts
3. Each concept becomes a card: visual explanation, quiz, or flashcard
4. Scroll through your personalized learning feed
5. Mark cards as learnt to track progress

## Tech Stack
- **Frontend:** React Native / Expo (TypeScript)
- **Backend:** AWS Lambda (Python), API Gateway, DynamoDB
- **AI:** AWS Bedrock (Claude) for content generation
- **Image Gen:** Google Gemini (Nano Banana) for educational illustrations
- **Storage:** S3 for generated images, DynamoDB single-table design

## Architecture
```
User → React Native App → API Gateway → Lambda → Bedrock Claude
                                                → Gemini (images) → S3
                                                → DynamoDB
```

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| POST | /generate | Generate cards for a new topic |
| GET | /feed | List topics or get cards for a topic |
| POST | /learn | Mark a card as learnt |
| POST | /delete | Delete a topic and its cards |

## Science Behind It
- **Picture Superiority Effect** — Images remembered 6x better than text
- **Mayer's Multimedia Principles** — One concept per card, visual + text
- **Active Recall** — Quizzes and flashcards test understanding
- **Dual Coding Theory** — Visual + verbal = stronger memory traces

## Team
Ajey Dhayashanker Loganathan
Harish Base
Samved Thimmasarathy
Tharun Murugan
Dev Mayankkumar Patel
