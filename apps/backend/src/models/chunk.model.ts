import mongoose, { Schema, Document } from 'mongoose';
import { ChunkMetadata } from '@compliance-analyzer/shared';

/**
 * Mongoose schema for a document chunk, including its embedding vector.
 * Stored in the `chunks` collection.
 */
export interface IChunkModel extends Document {
  chunkId: string;
  text: string;
  metadata: ChunkMetadata;
  /** Dense embedding vector from text-embedding-3-small (1536 dimensions) */
  embedding: number[];
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
  },
  { timestamps: false }
);

// Compound index for efficient per-document retrieval
ChunkSchema.index({ 'metadata.documentId': 1 });

export const ChunkModel = mongoose.model<IChunkModel>('Chunk', ChunkSchema);
