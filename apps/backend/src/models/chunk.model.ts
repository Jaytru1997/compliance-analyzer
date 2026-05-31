import mongoose, { Schema, Document } from 'mongoose';
import { ChunkMetadata } from '@compliance-analyzer/shared';

/**
 * Mongoose schema for a document chunk stored in the `chunks` collection.
 *
 * Each chunk contains:
 *   - Raw text content for display and LLM context
 *   - 384-dimensional dense embedding from local all-MiniLM-L6-v2 model
 *   - Pre-computed BM25 term frequencies for fast keyword retrieval
 *   - Rich metadata for filtering, citation, and compliance categorization
 */
export interface IChunkModel extends Document {
  chunkId: string;
  text: string;
  metadata: ChunkMetadata;
  /** Dense embedding vector from all-MiniLM-L6-v2 (384 dimensions) */
  embedding: number[];
  /** Pre-computed term frequencies for BM25 scoring (stemmed term → count) */
  termFrequencies: Record<string, number>;
  /** Token count of the chunk text (used for BM25 document-length normalization) */
  docLength: number;
}

const ChunkSchema = new Schema<IChunkModel>(
  {
    chunkId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    metadata: {
      documentId: { type: String, required: true, index: true },
      title: { type: String, default: '' },
      section: { type: String, default: '' },
      subsection: { type: String, default: '' },
      pageNumber: { type: Number, default: 1 },
      topics: { type: [String], default: [] },
      complianceCategory: { type: String, default: 'Procedure' },
    },
    embedding: { type: [Number], required: true },
    termFrequencies: { type: Schema.Types.Mixed, default: {} },
    docLength: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const ChunkModel = mongoose.model<IChunkModel>('Chunk', ChunkSchema);
