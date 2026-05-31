import { DocumentMetadata } from '@compliance-analyzer/shared';
import { ParserService } from './parser.service';
import { ragService } from './rag.service';
import { aiService } from './ai.service';
import { DocumentModel } from '../models/document.model';

export class DocumentService {
  /**
   * Full ingestion pipeline:
   * 1. Parse raw text from file
   * 2. Generate AI summary + topics
   * 3. Chunk text using hybrid strategy
   * 4. Embed chunks with text-embedding-3-small and store in MongoDB
   * 5. Persist DocumentMetadata to MongoDB
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
    });

    // Use the MongoDB ObjectId as our documentId for chunk metadata
    const documentId = (doc._id as { toString(): string }).toString();

    // 4. Chunk, embed, and store in MongoDB
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
}

export const documentService = new DocumentService();
