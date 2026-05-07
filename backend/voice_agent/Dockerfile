FROM python:3.13-slim

RUN apt-get update && apt-get install -y gcc build-essential libsndfile1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir .

# Pre-download the FastEmbed ONNX model at build time so the container never
# stalls downloading it from HuggingFace on the first search request.
RUN python -c "from fastembed import TextEmbedding; list(TextEmbedding('sentence-transformers/all-MiniLM-L6-v2').embed(['warmup']))"

COPY app/ ./app/


EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
