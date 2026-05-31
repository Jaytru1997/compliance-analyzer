import OpenAI from 'openai';
import { DocumentChunk, ChunkMetadata } from '@compliance-analyzer/shared';
import { ChunkModel } from '../models/chunk.model';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

// OpenAI client is optional — only initialised when OPENAI_API_KEY is present.
// If absent, the service falls back to TF-IDF keyword scoring for retrieval.
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small output size

/** Cosine similarity between two equal-length vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * TF-IDF-like keyword scoring fallback.
 * Used when OPENAI_API_KEY is not configured.
 */
function keywordScore(text: string, queryTerms: string[]): number {
  const lower = text.toLowerCase();
  return queryTerms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

export class RagService {
  /**
   * Embed text using OpenAI text-embedding-3-small.
   * Returns null when OpenAI is not configured (triggers keyword fallback).
   */
  async embed(text: string): Promise<number[] | null> {
    if (!openaiClient) return null;
    try {
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' ').substring(0, 8000),
      });
      return response.data[0].embedding;
    } catch (err) {
      console.error('[RAG] OpenAI embedding error:', err);
      return null;
    }
  }

  /**
   * Hybrid Chunking Strategy:
   * 1. Semantic split by double-newlines (paragraphs)
   * 2. Fixed-size grouping (~1000 chars) with 200-char overlap
   */
  chunkText(text: string, metadataTemplate: Partial<ChunkMetadata>): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    let currentChunkText = '';
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;

    for (const para of paragraphs) {
      if (currentChunkText.length + para.length > CHUNK_SIZE && currentChunkText.length > 0) {
        chunks.push(this.buildChunk(currentChunkText, metadataTemplate));
        const overlapText = currentChunkText.slice(-OVERLAP);
        currentChunkText = overlapText + '\n\n' + para;
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + para;
      }
    }

    if (currentChunkText.trim().length > 0) {
      chunks.push(this.buildChunk(currentChunkText, metadataTemplate));
    }

    return chunks;
  }

  private buildChunk(text: string, metadata: Partial<ChunkMetadata>): DocumentChunk {
    const firstLine = text.trim().split('\n')[0].substring(0, 50);
    return {
      id: uuidv4(),
      text,
      metadata: {
        documentId: metadata.documentId || 'unknown',
        title: metadata.title || 'Unknown Document',
        section: metadata.section || firstLine,
        subsection: metadata.subsection || '',
        pageNumber: metadata.pageNumber || 1,
        topics: metadata.topics || [],
        complianceCategory: metadata.complianceCategory || 'Procedure',
      },
    };
  }

  /**
   * Generate embeddings for all chunks in parallel batches, then persist to MongoDB.
   * When OPENAI_API_KEY is absent, stores zero vectors — retrieval will use keyword fallback.
   */
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    const BATCH_SIZE = 20;
    const docs = [];
    const useEmbeddings = openaiClient !== null;

    if (!useEmbeddings) {
      console.warn('[RAG] OPENAI_API_KEY not set — storing chunks without embeddings. Retrieval will use keyword scoring.');
    }

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      // Generate embeddings if OpenAI is available, else use zero vectors
      const embeddings = useEmbeddings
        ? await Promise.all(batch.map(c => this.embed(c.text).then(e => e ?? new Array(EMBEDDING_DIMENSION).fill(0))))
        : batch.map(() => new Array(EMBEDDING_DIMENSION).fill(0));

      for (let j = 0; j < batch.length; j++) {
        docs.push({
          chunkId: batch[j].id,
          text: batch[j].text,
          metadata: batch[j].metadata,
          embedding: embeddings[j],
        });
      }
    }

    await ChunkModel.insertMany(docs);
  }

  /**
   * Retrieve top-K chunks.
   * - With OPENAI_API_KEY: ranks by cosine similarity of text-embedding-3-small vectors.
   * - Without OPENAI_API_KEY: falls back to TF-IDF keyword scoring.
   * - Empty query (gap analysis): returns all chunks for the document unranked.
   */
  async retrieveChunks(
    query: string,
    filterByDocId?: string,
    topK: number = 5
  ): Promise<DocumentChunk[]> {
    const filter: Record<string, unknown> = filterByDocId
      ? { 'metadata.documentId': filterByDocId }
      : {};

    const candidates = await ChunkModel.find(filter).lean();

    if (!query || query.trim() === '') {
      // Gap analysis path — return all chunks without ranking
      return candidates.slice(0, topK).map((c: any) => ({
        id: c.chunkId,
        text: c.text,
        metadata: c.metadata,
      }));
    }

    // Try vector-based retrieval first
    const queryEmbedding = await this.embed(query);

    if (queryEmbedding) {
      // ── Vector retrieval (OpenAI available) ──────────────────────────────
      const scored = candidates.map((c: any) => ({
        chunk: { id: c.chunkId, text: c.text, metadata: c.metadata } as DocumentChunk,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }));
      scored.sort((a: any, b: any) => b.score - a.score);
      return scored.slice(0, topK).map((s: any) => s.chunk);
    } else {
      // ── Keyword fallback (no OpenAI key) ──────────────────────────────────
      const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
      const scored = candidates.map((c: any) => ({
        chunk: { id: c.chunkId, text: c.text, metadata: c.metadata } as DocumentChunk,
        score: keywordScore(c.text, queryTerms),
      }));
      scored.sort((a: any, b: any) => b.score - a.score);
      return scored
        .filter((s: any) => s.score > 0)
        .slice(0, topK)
        .map((s: any) => s.chunk);
    }
  }
}

export const ragService = new RagService();
