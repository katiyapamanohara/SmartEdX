# --- Builder Stage ---
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y gcc build-essential && rm -rf /var/lib/apt/lists/*

# Copy only the files needed for dependency resolution
COPY pyproject.toml README.md ./

# Install dependencies into /app/.venv
RUN uv venv && \
    uv pip install --no-cache .

# --- Runtime Stage ---
FROM python:3.13-slim

RUN apt-get update && apt-get install -y libsndfile1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the venv from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy source
COPY app/ ./app/
COPY assets/ ./assets/

# Expose ports
# 8000 - HTTP/WebSocket (FastAPI + SIP-over-WebSocket for testing)
# 5060 - SIP signaling (UDP) for Kamailio
# 20000 - RTP audio (UDP)
EXPOSE 8000
EXPOSE 5060/udp
EXPOSE 20000/udp

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
