# SmartEdX AI Core

AI-powered quiz generation service built with **FastAPI** and the **Agno** agent framework.
Supports **Anthropic Claude**, **OpenAI GPT**, and **Google Gemini** as LLM backends.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | ≥ 3.11 | [python.org](https://python.org) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

---

## Setup

### 1. Install dependencies

```bash
cd backend/ai_core
uv sync
```

`uv sync` reads `pyproject.toml`, creates `.venv/` automatically, and installs all packages.

---

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your chosen provider + API key:

```env
PORT=8001

# Choose one: anthropic | openai | gemini
AI_PROVIDER=gemini

# Fill in only the key for your chosen provider
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Model IDs per provider:
#   anthropic → claude-sonnet-4-6
#   openai    → gpt-4o
#   gemini    → gemini-2.0-flash
MODEL_ID=gemini-2.0-flash

CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

### 3. Start the service

```bash
# Option A — via uv run (recommended, no activation needed)
uv run python main.py

# Option B — activate venv first
source .venv/bin/activate
python main.py
```

The API is available at `http://localhost:8001`.
Interactive docs: `http://localhost:8001/docs`

---

## API

### `POST /api/quiz/generate`

Generate quiz questions from a document using AI.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | ✅ | PDF, `.docx`, `.doc`, `.pptx`, or `.ppt` |
| `num_questions` | int | ✅ | 1–20 (default `5`) |
| `difficulty` | string | ✅ | `easy` \| `medium` \| `hard` (default `medium`) |

**Example with curl:**

```bash
curl -X POST http://localhost:8001/api/quiz/generate \
  -F "file=@lecture.pdf" \
  -F "num_questions=5" \
  -F "difficulty=medium"
```

**Response:**

```json
{
  "questions": [
    {
      "id": "uuid",
      "question": "What is ...?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 2,
      "explanation": "Because ..."
    }
  ]
}
```

### `GET /health`

Returns service status and configured provider/model.

---

## Monorepo scripts

From the **project root**, you can manage ai_core via:

```bash
yarn install:ai_core   # install / sync dependencies
yarn dev:ai_core       # start the service in dev mode
```

Or start everything together:

```bash
yarn start             # starts all services including ai_core
yarn start:backend     # starts backend services including ai_core
```

---

## Supported AI Providers

| Provider | `AI_PROVIDER` value | Recommended `MODEL_ID` |
|----------|--------------------|-----------------------|
| Anthropic Claude | `anthropic` | `claude-sonnet-4-6` |
| OpenAI GPT | `openai` | `gpt-4o` |
| Google Gemini | `gemini` | `gemini-2.0-flash` |

Only install the API key for the provider you intend to use — the others can be left blank.
