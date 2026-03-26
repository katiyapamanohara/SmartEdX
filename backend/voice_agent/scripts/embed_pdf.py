"""Embed PDF into a new Qdrant collection using FastEmbed (all-MiniLM-L6-v2, 384 dims).

This uses the same embedding model as mcp-server-qdrant so the MCP toolset can query it.
"""

import uuid

import fitz  # PyMuPDF
import requests
from fastembed import TextEmbedding

from app import config

# --- Configuration ---
PDF_PATH = "dprekb.pdf"
QDRANT_URL = config.QDRANT_URL
COLLECTION_NAME = config.QDRANT_COLLECTION_NAME
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
CHUNK_SIZE = 1000  # characters per chunk
CHUNK_OVERLAP = 200  # overlap between chunks
BATCH_SIZE = 50  # points per upsert batch


def qdrant_request(method, path, json=None):
    """Make a request to Qdrant REST API."""
    url = f"{QDRANT_URL}{path}"
    r = requests.request(method, url, json=json, timeout=30)
    r.raise_for_status()
    return r.json()


def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """Extract text from each page of the PDF."""
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append({"page": i + 1, "text": text})
    doc.close()
    return pages


def chunk_text(pages: list[dict], chunk_size: int, overlap: int) -> list[dict]:
    """Split page text into overlapping chunks."""
    chunks = []
    for page_info in pages:
        text = page_info["text"]
        page_num = page_info["page"]
        start = 0
        chunk_idx = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(
                {
                    "text": chunk,
                    "page": page_num,
                    "chunk_index": chunk_idx,
                }
            )
            start += chunk_size - overlap
            chunk_idx += 1
    return chunks


def embed_chunks(chunks: list[dict]) -> list[list[float]]:
    """Generate embeddings for all chunks using FastEmbed (same model as mcp-server-qdrant)."""
    print(f"  Loading FastEmbed model: {EMBEDDING_MODEL}")
    model = TextEmbedding(EMBEDDING_MODEL)
    texts = [c["text"] for c in chunks]
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]


def main():
    # 1. Extract text
    print(f"[1/4] Extracting text from: {PDF_PATH}")
    pages = extract_text_from_pdf(PDF_PATH)
    print(f"  Extracted {len(pages)} pages")

    # 2. Chunk
    print(f"[2/4] Chunking text (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    chunks = chunk_text(pages, CHUNK_SIZE, CHUNK_OVERLAP)
    print(f"  Created {len(chunks)} chunks")

    # 3. Embed
    print(f"[3/4] Generating {EMBEDDING_DIM}-dim embeddings with FastEmbed ({EMBEDDING_MODEL})")
    embeddings = embed_chunks(chunks)

    # 4. Upload to Qdrant via REST API
    print(f"[4/4] Uploading to Qdrant collection: {COLLECTION_NAME}")

    # Check if collection exists and delete it
    collections = qdrant_request("GET", "/collections")
    existing = [c["name"] for c in collections["result"]["collections"]]
    if COLLECTION_NAME in existing:
        qdrant_request("DELETE", f"/collections/{COLLECTION_NAME}")
        print(f"  Deleted existing collection: {COLLECTION_NAME}")

    # Create collection
    qdrant_request(
        "PUT",
        f"/collections/{COLLECTION_NAME}",
        json={
            "vectors": {
                "size": EMBEDDING_DIM,
                "distance": "Cosine",
            }
        },
    )
    print(f"  Created collection with {EMBEDDING_DIM}-dim cosine vectors")

    # Upsert in batches
    for i in range(0, len(chunks), BATCH_SIZE):
        batch_chunks = chunks[i : i + BATCH_SIZE]
        batch_embeddings = embeddings[i : i + BATCH_SIZE]
        points = []
        for j, (chunk, embedding) in enumerate(zip(batch_chunks, batch_embeddings)):
            idx = i + j
            points.append(
                {
                    "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"dp_kb_chunk_{idx}")),
                    "vector": embedding,
                    "payload": {
                        "content": chunk["text"],
                        "page": chunk["page"],
                        "chunk_index": chunk["chunk_index"],
                        "source": PDF_PATH,
                    },
                }
            )
        qdrant_request("PUT", f"/collections/{COLLECTION_NAME}/points", json={"points": points})
        print(f"  Upserted {min(i + BATCH_SIZE, len(chunks))}/{len(chunks)} points")

    # Verify
    info = qdrant_request("GET", f"/collections/{COLLECTION_NAME}")
    result = info["result"]
    print(f"\nDone! Collection '{COLLECTION_NAME}' has {result['points_count']} points")
    print(
        f"Vector size: {result['config']['params']['vectors']['size']}, Distance: {result['config']['params']['vectors']['distance']}"
    )


if __name__ == "__main__":
    main()
