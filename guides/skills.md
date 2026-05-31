# Demonstrated Skills

This project demonstrates a comprehensive set of skills tailored to building production-grade, AI-powered compliance systems.

## 1. Full-Stack Development

- **React 18 & TypeScript:** Building modular, type-safe frontend components.
- **Vite & Turborepo:** High-performance monorepo build tooling and fast dev server.
- **Material-UI (MUI) v6:** Implementing enterprise-grade, accessible, and responsive user interfaces.
- **Node.js & Express:** Robust backend API architecture with proper middleware, error handling, and routing.

## 2. Advanced AI & Hybrid RAG Architecture

- **Multi-Stage Retrieval Pipeline:** Implemented an industry best-in-class pipeline matching systems like Elasticsearch and Azure AI Search.
- **Local Machine Learning:** Deployed `all-MiniLM-L6-v2` locally via Transformers.js (ONNX Runtime) for zero-latency, zero-cost dense embeddings.
- **Okapi BM25 Keyword Search:** Built a custom BM25 index with token stemming, stopword removal, and TF-IDF scoring.
- **Reciprocal Rank Fusion (RRF):** Merging vector similarity and BM25 scores into a unified ranking system.
- **Cross-Encoder Reranking:** Leveraging Claude to rerank final candidates based on complex semantic relevance.
- **Anthropic Claude Integration:** Utilizing Claude (`claude-sonnet-4-6`) for complex reasoning and gap analysis.
- **Advanced Chunking:** Implementing hybrid chunking (semantic + fixed-size with overlap) to maintain document context.
- **Metadata Enrichment:** Tagging chunks with hierarchical metadata (documentId, section, subsection, complianceCategory) to improve retrieval accuracy.

## 3. Compliance Domain Expertise

- **Mining Safety Standards:** Understanding the hierarchical nature of compliance documents, bridging ACME Site Procedures with Recognised Standards.
- **Gap Analysis Automation:** Engineering prompts to perform multi-stage gap analysis (Full Compliance, Partial Gap, Full Gap) with severity ratings and citations.
- **Audit Trails:** Ensuring every AI response is grounded in document context with explicit citations, preventing hallucinations.

## 4. Prompt Engineering

- **Query Expansion:** Instructing the LLM to generate domain-specific synonyms and acronym expansions to boost BM25 recall.
- **System Guardrails:** Crafting role-based prompts ("Senior mining safety compliance auditor") to enforce tone, structure, and factual accuracy.
- **Structured Output:** Designing prompts that enforce JSON/XML outputs for seamless frontend parsing and rendering.

## 5. Software Architecture & Design

- **Monorepo Structure:** Clean separation of concerns between `apps/frontend`, `apps/backend`, and `packages/shared`.
- **Service-Oriented Backend:** Decoupling upload, parsing, RAG, and AI services for testability and maintainability.
- **State Management:** Using Zustand for predictable and lightweight frontend state management.

## 6. Testing & Quality Assurance

- **Unit Testing:** Implementing tests for critical services (document parsing, chunking logic, gap analysis).
- **Error Boundaries & Graceful Degradation:** Handling LLM failures, rate limits, and parsing errors gracefully.
