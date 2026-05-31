import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagService } from '../rag.service';
import { ChunkModel } from '../../models/chunk.model';

vi.mock('../../models/chunk.model', () => ({
  ChunkModel: {
    find: vi.fn(),
    insertMany: vi.fn(),
  },
}));

// Mock openai to force the keyword fallback path
vi.mock('openai', () => ({
  default: class OpenAI {
    embeddings = {
      create: vi.fn().mockRejectedValue(new Error('No API key')),
    };
  },
}));

describe('RagService', () => {
  let ragService: RagService;

  beforeEach(() => {
    vi.clearAllMocks();
    ragService = new RagService();
  });

  it('should fallback to keyword scoring when openai is unavailable', async () => {
    const mockChunks = [
      {
        chunkId: 'c1',
        text: 'This chunk mentions safety and harness.',
        metadata: { documentId: 'doc123', section: '1', title: 'T', subsection: '', pageNumber: 1, topics: [], complianceCategory: 'Standard' },
        embedding: [],
      },
      {
        chunkId: 'c2',
        text: 'This chunk is completely irrelevant.',
        metadata: { documentId: 'doc123', section: '2', title: 'T', subsection: '', pageNumber: 2, topics: [], complianceCategory: 'Standard' },
        embedding: [],
      },
    ];

    vi.mocked(ChunkModel.find).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockChunks) } as any);

    const results = await ragService.retrieveChunks('safety harness', 'doc123', 1);

    expect(ChunkModel.find).toHaveBeenCalledWith({ 'metadata.documentId': 'doc123' });
    expect(results).toHaveLength(1);
    // The keyword-matching chunk should be the one returned
    expect(results[0].id).toBe('c1');
    expect(results[0].text).toContain('safety and harness');
  });

  it('should chunk text into DocumentChunk objects with correct shape', () => {
    const text = 'First paragraph about safety.\n\nSecond paragraph about compliance.';
    const chunks = ragService.chunkText(text, { documentId: 'doc123', title: 'Test Doc' });

    expect(chunks.length).toBeGreaterThan(0);
    // id is a uuid string
    expect(chunks[0].id).toBeDefined();
    expect(typeof chunks[0].id).toBe('string');
    // metadata.documentId is set from the template
    expect(chunks[0].metadata.documentId).toBe('doc123');
    expect(chunks[0].text).toBeDefined();
  });
});

