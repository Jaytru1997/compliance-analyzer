import { DocumentMetadata } from '@compliance-analyzer/shared';
import { ParserService } from './parser.service';
import { ragService } from './rag.service';
import { aiService } from './ai.service';
import { DocumentModel } from '../models/document.model';

export class DocumentService {
  /**
   * Full ingestion pipeline:
   * 1. Parse raw text from file (PDF, DOCX, TXT)
   * 2. Generate AI summary + topics via Claude
   * 3. Chunk text using hybrid strategy (semantic + fixed-size with overlap)
   * 4. Embed chunks locally with all-MiniLM-L6-v2 (384-dim)
   * 5. Compute BM25 term frequencies for keyword retrieval
   * 6. Persist everything to MongoDB
   */
  async ingestDocument(
    file: Express.Multer.File,
    category: 'Standard' | 'Procedure'
  ): Promise<DocumentMetadata> {
    // 1. Parse file
    const text = await ParserService.parseDocument(file.path, file.mimetype);

    // 2. Summarise and extract topics
    const { summary, topics } = await aiService.summarizeDocument(text);

    // 3. Persist document record to MongoDB first (to get its _id)
    const doc = await DocumentModel.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadDate: new Date().toISOString(),
      complianceCategory: category,
      summary,
      topics,
      fullText: text,
    });

    // Use the MongoDB ObjectId as our documentId for chunk metadata
    const documentId = (doc._id as { toString(): string }).toString();

    // 4. Chunk, embed (local model), compute BM25 term frequencies, and store in MongoDB
    const chunks = ragService.chunkText(text, {
      documentId,
      title: file.originalname,
      complianceCategory: category,
      topics,
    });
    await ragService.storeChunks(chunks);

    // Return as shared DocumentMetadata shape
    return doc.toJSON() as DocumentMetadata;
  }

  async getDocuments(): Promise<DocumentMetadata[]> {
    const docs = await DocumentModel.find().sort({ uploadDate: -1 }).lean();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      uploadDate: d.uploadDate,
      complianceCategory: d.complianceCategory,
      summary: d.summary,
      topics: d.topics,
    })) as DocumentMetadata[];
  }

  async getDocumentById(id: string): Promise<DocumentMetadata | null> {
    const doc = await DocumentModel.findById(id).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadDate: doc.uploadDate,
      complianceCategory: doc.complianceCategory,
      summary: doc.summary,
      topics: doc.topics,
    } as DocumentMetadata;
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      // 1. Delete all chunks associated with this document
      await ragService.deleteChunksForDocument(id);

      // 2. Delete the document metadata
      const result = await DocumentModel.findByIdAndDelete(id);

      return !!result;
    } catch (error) {
      console.error(`[DocumentService] Error deleting document ${id}:`, error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();
