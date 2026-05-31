# AI Rules & Guardrails

To maintain the integrity, security, and reliability of the AI-Powered Compliance Document Analyzer, the following rules must be strictly adhered to by any LLM or AI agent interacting with this codebase.

## 1. No Hallucinations

- **Grounding Requirement:** All answers, summaries, and gap analyses must be strictly grounded in the provided document chunks.
- **Citation Mandate:** Every claim or extracted requirement must include a citation to the specific section, subsection, or page number from the source document.
- **"I Don't Know" Fallback:** If the required information is not present in the retrieved chunks, the AI must explicitly state that the information is missing rather than inventing an answer.

## 2. Scope Control

- **Domain Restriction:** The AI should only answer questions related to mining safety, compliance, the uploaded ACME procedures, and recognized standards.
- **Prompt Injection Defense:** System prompts must instruct the AI to ignore any user requests that attempt to override its role as a compliance auditor.

## 3. Codebase Modification Rules

- **Structural Integrity:** Do not create or modify files outside of the defined `apps/frontend`, `apps/backend`, `packages/shared`, `docs/`, and `guides/` directories.
- **Type Safety:** All new code must be strictly typed using TypeScript. Avoid `any` types.
- **Component Reusability:** When adding UI features, utilize existing MUI v6 components and maintain consistent styling.

## 4. Security & Privacy

- **Mock Authentication:** The system uses mock authentication (`admin` / `admin123`) for demonstration. Do not implement complex auth flows unless explicitly requested.
- **Data Handling:** Documents are processed in-memory. Do not write parsed document content to persistent disk storage outside of the defined architecture.

## 5. Structured Output

- **Format Compliance:** When asked to provide structured data (e.g., Gap Analysis results), the AI must strictly adhere to the requested JSON or XML schema. Extraneous conversational text must be omitted from structured payloads.
