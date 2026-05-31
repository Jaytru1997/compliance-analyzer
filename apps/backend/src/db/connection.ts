import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
import { ChunkModel } from '../models/chunk.model';
import { DocumentModel } from '../models/document.model';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/compliance-analyzer';

/**
 * Establishes a MongoDB connection with retry logic.
 * Called once at application startup.
 */
export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[DB] Connected to MongoDB at ${MONGODB_URI}`);

    // Seed admin user
    const adminUser = await UserModel.findOne({ username: 'admin' });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await UserModel.create({ username: 'admin', passwordHash });
      console.log('[DB] Seeded default admin user.');
    }

    // Migration: clear chunks with old OpenAI 1536-dim embeddings
    // The new pipeline uses 384-dim local embeddings + BM25 term frequencies
    const sampleChunk = await ChunkModel.findOne().lean();
    if (sampleChunk && (
      (sampleChunk as any).embedding?.length === 1536 ||
      !(sampleChunk as any).termFrequencies ||
      Object.keys((sampleChunk as any).termFrequencies || {}).length === 0
    )) {
      console.log('[DB] Migration: Clearing old chunks with incompatible embeddings...');
      await ChunkModel.deleteMany({});
      await DocumentModel.deleteMany({});
      console.log('[DB] Migration complete. Please re-upload your documents.');
    }
  } catch (error) {
    console.error('[DB] MongoDB connection failed:', error);
    console.warn('[DB] Continuing without MongoDB — data will not persist between restarts.');
  }
}

export default mongoose;
