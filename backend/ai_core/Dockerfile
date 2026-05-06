FROM python:3.11-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
RUN apt-get update && apt-get install -y gcc build-essential && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml requirements.txt ./
RUN uv venv && uv pip install --no-cache -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
COPY config.py main.py ./
COPY routers ./routers
COPY utils ./utils
COPY agents ./agents
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
