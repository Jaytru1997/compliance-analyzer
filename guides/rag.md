# Retrieval-Augmented Generation (RAG) Strategy

This document outlines the advanced multi-stage RAG architecture designed specifically for mining safety compliance documents.

## Multi-Stage Retrieval Pipeline

The system uses an industry best-in-class hybrid retrieval pipeline that completely eliminates the need for paid external embedding APIs (like OpenAI) while achieving superior search relevance.

The pipeline mirrors architectures used in production by Elasticsearch, Azure AI Search, and Cohere. It consists of five stages:

1. **Query Expansion:** Claude generates technical synonyms and alternate phrasings for the user's query to improve recall.
2. **BM25 Retrieval:** Okapi BM25 scores chunks using statistical term frequencies and inverse document frequencies (TF-IDF), providing robust keyword matching.
3. **Dense Vector Retrieval:** Semantic similarity search using local `all-MiniLM-L6-v2` embeddings (384 dimensions) running via ONNX Runtime in Node.js.
4. **Reciprocal Rank Fusion (RRF):** Mathematically merges the rankings from BM25 and Vector Search into a single unified score.
5. **Cross-Encoder Reranking:** Claude scores the top candidates for final contextual relevance before they are sent to the generation prompt.

## Chunking Strategy

Compliance documents (like ACME site procedures and recognized standards) are highly structured, hierarchical, and context-dense. A simple fixed-size chunking strategy often splits critical requirements or severs the relationship between a parent section heading and its bullet points.

### Hybrid Approach

We employ a **Hybrid Chunking Strategy**:

1. **Semantic Chunking:** The document is first parsed structurally, identifying headers (H1, H2, H3) and logical sections.
2. **Fixed-Size with Overlap:** Large sections are then subdivided into fixed-size chunks of 800-1200 tokens. Crucially, a **200-token overlap** is maintained between consecutive chunks.

## Metadata Enrichment

Every chunk is enriched with a rich metadata payload before embedding:

```typescript
{
  documentId: string;
  title: string;
  section: string;
  subsection: string;
  pageNumber: number;
  topics: string[]; // e.g., ["PPE", "heights", "excavation"]
  complianceCategory: string; // e.g., "Standard", "Procedure"
}
```

### Why Metadata Matters

- **Precision Filtering:** When a user asks about "PPE in excavations", the system can pre-filter chunks where `topics` includes "PPE" or "excavation".
- **Accurate Citations:** The `section`, `subsection`, and `pageNumber` metadata are passed directly to the LLM, enabling it to generate precise, verifiable citations in its responses.
