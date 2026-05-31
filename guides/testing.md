# Testing Strategy

Ensuring the reliability of the Compliance Document Analyzer requires a robust testing strategy, particularly for the parsing, chunking, and AI integration services.

## Testing Layers

### 1. Unit Testing
- **Document Parsing:** Tests to verify that `pdf-parse` and `mammoth` correctly extract text from sample `.pdf` and `.docx` files without losing critical formatting (like list items).
- **Chunking Logic:** Tests to assert that the hybrid chunking strategy correctly splits text into 800-1200 token chunks, maintains the exact 200-token overlap, and correctly assigns metadata based on simulated header parsing.
- **Utility Functions:** Tests for shared formatting or validation utilities.

### 2. Integration Testing
- **RAG Pipeline Integration:** Tests that simulate feeding a document into the system, retrieving chunks based on a query vector, and asserting that the top-K chunks contain the expected text.
- **Gap Analysis Orchestration:** Mocking the Anthropic API response to ensure the backend correctly parses the JSON/XML output and formats it for the frontend API response.

### 3. E2E & AI Output Validation (Manual/Semi-Automated)
- **Prompt Effectiveness:** Evaluating the quality of LLM responses against a set of known "golden" compliance queries.
- **Hallucination Checks:** Ensuring that queries asking for non-existent information correctly trigger the fallback "I don't know" response.

## Test Implementation
- **Framework:** Jest or Vitest will be used for unit and integration testing.
- **Mocks:** Network requests to Anthropic's API will be mocked during CI/CD to prevent unnecessary billing and ensure deterministic test results.
