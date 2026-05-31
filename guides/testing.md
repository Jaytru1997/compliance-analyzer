# Testing Strategy

Ensuring the reliability of the Compliance Document Analyzer requires a robust testing strategy, particularly for the parsing, chunking, and AI integration services.

## Testing Framework & Setup

- **Framework:** Vitest v4.1.7 - Modern, fast unit test framework with ESM support and excellent TypeScript integration
- **React Testing:** @testing-library/react for component testing with DOM assertions
- **Test Environment:** jsdom for frontend tests, Node.js for backend tests
- **Configuration:** setupTests.ts initializes testing utilities and DOM matchers

## Running Tests

### Quick Start - Run All Tests

```bash
npm test                    # Run all tests (backend + frontend) from root
npm run test:backend        # Run backend tests only  
npm run test:frontend       # Run frontend tests only
npm run test:all            # Run backend then frontend sequentially
```

### Run Tests with Options

**Frontend:**

```bash
cd apps/frontend

npm test              # Run tests once and exit
npm run test:watch    # Run in watch mode (re-run on file changes)
npm run test:coverage # Generate coverage report
```

**Backend:**

```bash
cd apps/backend

npm test              # Run tests once and exit
npm run test:watch    # Run in watch mode
npm run test:coverage # Generate coverage report
```

## Test Structure

### Backend Tests (7 tests, 100% passing)

**Location:** `apps/backend/src/services/__tests__/`

1. **gap-analysis.service.test.ts** (1 test)
   - Tests Gap Analysis Service orchestration
   - Mocks AI and RAG services to verify correct chunk retrieval and comparison logic

2. **parser.service.test.ts** (4 tests)
   - `parsePDF()`: Verifies PDF text extraction
   - `parseDocx()`: Verifies DOCX text extraction
   - `parseText()`: Verifies plain text handling
   - Edge cases: Empty files, special characters, large documents

3. **rag.service.test.ts** (2 tests)
   - Semantic chunking with fixed-size batching and overlap
   - **Fallback Testing:** Verifies TF-IDF keyword scoring works when OpenAI API key is unavailable
   - Embedding generation and vector storage

**Running Backend Tests:**

```bash
cd apps/backend
npm test              # Runs vitest run
npm run test:watch    # Runs vitest in watch mode
npm run test:coverage # Generates coverage report
```

### Frontend Tests (8 tests, 100% passing)

**Location:** `apps/frontend/src/stores/__tests__/` and `apps/frontend/src/components/__tests__/`

1. **authStore.test.ts** (8 tests) ✅
   - Initial state verification
   - Login success/failure scenarios
   - Error handling (network failures, API errors)
   - Multiple login attempts
   - Logout functionality
   - State persistence across store calls

2. **DocumentCard.test.tsx** (in progress)
   - Component rendering with Document metadata
   - File type icon display (PDF vs other formats)
   - Compliance category chips
   - Date and file size formatting
   - Topic display with +N indicator
   - Edge cases (no metadata, very long names, many topics)

**Running Frontend Tests:**

```bash
cd apps/frontend
npm test              # Runs vitest --run
npm run test:watch    # Runs vitest in watch mode
npm run test:coverage # Generates coverage report
```

## Test Implementation Details

### Unit Tests

- **Backend Services:** Tests for document parsing, RAG pipeline, and gap analysis service
- **Frontend State:** Zustand store tests for authentication and user session management
- **UI Components:** React component tests using @testing-library/react

### Integration Tests

- **RAG Pipeline Integration:** Verifies document ingestion → chunking → embedding → storage
- **Gap Analysis Orchestration:** Tests the full workflow of comparing two documents
- **API Client Mocking:** Axios requests are mocked to simulate backend responses

### Mocking Strategy

- **API Mocks:** Vitest's `vi.mock()` for module mocking
  - `@anthropic-ai/sdk` - Mocked for AI service tests
  - `openai` - Optional OpenAI embedding mock (tests fallback without it)
  - `axios` - Mocked for frontend API client tests
  - `react-router-dom` - Mocked for component navigation tests

- **Database Mocks:** MongoDB models are mocked during tests to avoid database dependencies

## Test Coverage Goals

- **Backend:** Focus on critical paths (parsing, chunking, gap analysis)
- **Frontend:** Core state management (auth) and key component logic
- **Fallback Mechanisms:** Ensure graceful degradation when optional services unavailable

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

- No external API calls (all mocked)
- No database dependencies (mocked)
- Fast execution (< 10 seconds total)
- Deterministic results (no flakiness)

## Continuous Improvement

Tests should be updated when:

- New features are added (add corresponding tests)
- Bugs are fixed (add regression tests)
- Dependencies are upgraded (verify test compatibility)
- Documentation changes (keep test examples in sync)

## Troubleshooting

**Tests are slow:**

- Check for missing mocks causing real API calls
- Verify jsdom environment isn't doing unnecessary rendering
- Use `test.only()` to run individual tests during development

**Tests are flaky:**

- Check for async/await issues in test code
- Verify mocks are properly reset in `beforeEach`
- Ensure no global state pollution between tests

**Import errors:**

- Verify alias paths in vite.config.ts match tsconfig.json
- Check that mock module names match actual import paths
- Clear node_modules and reinstall if needed
