import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { connectDB } from './db/connection';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import chatRoutes from './routes/chat.routes';
import gapAnalysisRoutes from './routes/gap-analysis.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      process.env.FRONTEND_URL?.replace(/\/$/, '') // allow without trailing slash
    ].filter(Boolean);

    if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    
    // Fallback logic for safety or misconfigured prod URL
    callback(null, true); 
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gap-analysis', gapAnalysisRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB, then start HTTP server
(async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
  });
})();
