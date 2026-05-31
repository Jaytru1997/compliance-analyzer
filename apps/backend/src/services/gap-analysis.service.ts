import { GapAnalysisFinding } from '@compliance-analyzer/shared';
import { ragService } from './rag.service';
import { aiService } from './ai.service';

export class GapAnalysisService {
  async analyze(standardDocId: string, procedureDocId: string): Promise<GapAnalysisFinding[]> {
    // Retrieve all chunks for the specific documents
    // For this assessment, we assume the inMemoryStore allows us to fetch chunks
    // We will pass an empty query to our mock retrieval to get all chunks for the doc
    const standardChunks = await ragService.retrieveChunks('', standardDocId, 100);
    const procedureChunks = await ragService.retrieveChunks('', procedureDocId, 100);

    // If documents are extremely large, we would do a chunk-by-chunk comparative analysis
    // For MVP, we combine the texts with citations
    const standardText = standardChunks.map(c => `[Citation: ${c.metadata.section} (Page ${c.metadata.pageNumber})]\n${c.text}`).join('\n\n');
    const procedureText = procedureChunks.map(c => `[Citation: ${c.metadata.section} (Page ${c.metadata.pageNumber})]\n${c.text}`).join('\n\n');

    // Send to AI for Gap Analysis
    const findings = await aiService.performGapAnalysis(standardText, procedureText);
    return findings;
  }
}

export const gapAnalysisService = new GapAnalysisService();
