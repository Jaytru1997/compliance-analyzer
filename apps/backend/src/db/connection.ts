import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/user.model';
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
  } catch (error) {
    console.error('[DB] MongoDB connection failed:', error);
    console.warn('[DB] Continuing without MongoDB — data will not persist between restarts.');
  }
}

export default mongoose;
