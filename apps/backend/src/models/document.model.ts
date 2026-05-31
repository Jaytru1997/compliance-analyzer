import mongoose, { Schema, Document } from 'mongoose';
import { DocumentMetadata } from '@compliance-analyzer/shared';

/**
 * Mongoose document interface extending the shared DocumentMetadata type.
 * Stored in the `documents` collection.
 */
export interface IDocumentModel extends Omit<DocumentMetadata, 'id'>, Document {}

const DocumentSchema = new Schema<IDocumentModel>(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadDate: { type: String, required: true },
    complianceCategory: {
      type: String,
      enum: ['Standard', 'Procedure'],
      required: true,
    },
    summary: { type: String, default: '' },
    topics: { type: [String], default: [] },
    fullText: { type: String, default: '' },
  },
  {
    // Use Mongoose's _id (ObjectId) as `id` via toJSON transform
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const DocumentModel = mongoose.model<IDocumentModel>('Document', DocumentSchema);
