# Retrieval-Augmented Generation (RAG) Strategy

This document outlines the RAG architecture and chunking strategy designed specifically for mining safety compliance documents.

## Chunking Strategy

Compliance documents (like ACME site procedures and recognized standards) are highly structured, hierarchical, and context-dense. A simple fixed-size chunking strategy often splits critical requirements or severs the relationship between a parent section heading and its bullet points.

### Hybrid Approach
We employ a **Hybrid Chunking Strategy**:
1. **Semantic Chunking:** The document is first parsed structurally, identifying headers (H1, H2, H3) and logical sections.
2. **Fixed-Size with Overlap:** Large sections are then subdivided into fixed-size chunks of 800-1200 tokens. Crucially, a **200-token overlap** is maintained between consecutive chunks.

### Justification
- **Preserving Context:** The 200-token overlap ensures that cross-references or sentences spanning a chunk boundary are not lost.
- **Structural Integrity:** By aligning chunk boundaries with semantic sections where possible, the AI receives coherent thoughts rather than fragmented sentences.

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
- **Precision Filtering:** When a user asks about "PPE in excavations", the system pre-filters chunks where `topics` includes "PPE" or "excavation", drastically reducing the search space and improving retrieval accuracy.
- **Accurate Citations:** The `section`, `subsection`, and `pageNumber` metadata are passed directly to the LLM, enabling it to generate precise, verifiable citations in its responses, a critical requirement for compliance auditing.

## Embedding and Retrieval
- **Embedding Model:** Compatible with standard dense embedding models.
- **Vector Store:** For this assessment, an in-memory vector store (e.g., via LangChain's MemoryVectorStore) is used.
- **Retrieval:** Top-K retrieval based on cosine similarity, filtered by document ID or topic metadata depending on the user's query context.
