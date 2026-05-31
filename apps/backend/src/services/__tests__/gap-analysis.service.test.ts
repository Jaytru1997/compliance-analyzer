import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gapAnalysisService } from '../gap-analysis.service';
import { ragService } from '../rag.service';
import { aiService } from '../ai.service';
import { DocumentChunk, GapAnalysisFinding } from '@compliance-analyzer/shared';

vi.mock('../rag.service', () => ({
  ragService: {
    retrieveChunks: vi.fn(),
  },
}));

vi.mock('../ai.service', () => ({
  aiService: {
    performGapAnalysis: vi.fn(),
  },
}));

describe('GapAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve chunks and call AI service for gap analysis', async () => {
    const mockStandardChunks: DocumentChunk[] = [
      {
        id: '1',
        text: 'Standard content 1',
        metadata: {
          documentId: 'std123',
          title: 'Standard Doc',
          section: '1.0',
          subsection: '',
          pageNumber: 1,
          topics: [],
          complianceCategory: 'Standard',
        },
      },
    ];
    const mockProcedureChunks: DocumentChunk[] = [
      {
        id: '2',
        text: 'Procedure content 1',
        metadata: {
          documentId: 'proc123',
          title: 'Procedure Doc',
          section: '2.0',
          subsection: '',
          pageNumber: 2,
          topics: [],
          complianceCategory: 'Procedure',
        },
      },
    ];

    vi.mocked(ragService.retrieveChunks).mockImplementation(async (_q, docId) => {
      if (docId === 'std123') return mockStandardChunks;
      if (docId === 'proc123') return mockProcedureChunks;
      return [];
    });

    const mockFindings: GapAnalysisFinding[] = [
      {
        type: 'Partial Gap',
        requirement: 'Standard content 1',
        standardCitation: '1.0',
        procedureCitation: '2.0',
        severity: 'Medium',
        recommendation: 'Update procedure to include this requirement.',
      },
    ];

    vi.mocked(aiService.performGapAnalysis).mockResolvedValue(mockFindings);

    const result = await gapAnalysisService.analyze('std123', 'proc123');

    expect(ragService.retrieveChunks).toHaveBeenCalledWith('', 'std123', 100);
    expect(ragService.retrieveChunks).toHaveBeenCalledWith('', 'proc123', 100);
    expect(aiService.performGapAnalysis).toHaveBeenCalledWith(
      '[Citation: 1.0 (Page 1)]\nStandard content 1',
      '[Citation: 2.0 (Page 2)]\nProcedure content 1'
    );
    expect(result).toEqual(mockFindings);
  });
});

