export interface DocumentMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: string;
  complianceCategory?: 'Standard' | 'Procedure';
  summary?: string;
  topics?: string[];
  fullText?: string;
}

export interface ChunkMetadata {
  documentId: string;
  title: string;
  section: string;
  subsection: string;
  pageNumber: number;
  topics: string[];
  complianceCategory: string;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface GapAnalysisFinding {
  type: 'Full Gap' | 'Partial Gap' | 'Full Compliance';
  requirement: string;
  standardCitation: string;
  procedureCitation: string;
  severity: 'High' | 'Medium' | 'Low';
  recommendation: string;
}

export interface GapAnalysisResponse {
  findings: GapAnalysisFinding[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export interface DocumentContent {
  id: string;
  originalName: string;
  fullText: string;
}
