# AI-Powered Compliance Document Analyzer

A full-stack application designed to help mining safety compliance auditors analyze, interrogate, and compare ACME site procedures against recognized standards using an Anthropic Claude-powered Retrieval-Augmented Generation (RAG) architecture.

## Overview

This repository uses Turborepo for monorepo management. It contains:

- `apps/frontend`: React 18, TypeScript, Vite, Material-UI v6, Zustand. Features **Code Splitting** for optimized performance.
- `apps/backend`: Node.js, Express, TypeScript, **Mongoose/MongoDB** for persistent storage.
- `AI Integration`: Anthropic Claude API for reasoning (`claude-sonnet-4-6`), **SSE Streaming** for real-time Q&A, and a **multi-stage hybrid RAG pipeline** featuring local dense embeddings (`all-MiniLM-L6-v2`), Okapi BM25, Reciprocal Rank Fusion, and Claude-based cross-encoder reranking.
- `docs/`: Storage for mock ACME procedures and Recognized Standards.
- `guides/`: Complete documentation describing architecture, AI RAG setup, prompt engineering, and more.

### Authentication

- A default admin user is seeded into the MongoDB database upon startup.

## Guides

For comprehensive understanding of the system, architecture, and AI components, please refer to the following guides:

- [Setup Instructions](./guides/setup.md)
- [Architecture Diagram & Explanation](./guides/architecture.md)
- [RAG & Chunking Strategy](./guides/rag.md)
- [Prompt Engineering System Prompts](./guides/prompt-engineering.md)
- [Compliance Domain Logic](./guides/compliance-domain.md)
- [Testing Strategy](./guides/testing.md)
- [AI Rules & Guardrails](./guides/rules.md)
- [Developer Skills Demonstrated](./guides/skills.md)
