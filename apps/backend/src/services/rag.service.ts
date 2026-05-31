/**
 * Hybrid RAG Service — Multi-Stage Retrieval Pipeline
 *
 * Implements an industry best-in-class Retrieval-Augmented Generation pipeline
 * combining four retrieval techniques:
 *
 *   1. BM25 (Okapi BM25)        — Statistical keyword retrieval with TF-IDF + doc length normalization
 *   2. Dense Vector Retrieval    — Semantic similarity via local all-MiniLM-L6-v2 embeddings
 *   3. Reciprocal Rank Fusion    — Merges BM25 + vector rankings into unified scores
 *   4. Claude Cross-Encoder      — LLM-based reranking of top candidates for final selection
 *
 * This architecture mirrors production systems used by Elasticsearch (hybrid search),
 * Azure AI Search (semantic ranker), Cohere (Rerank v3), and Pinecone (hybrid + rerank).
 *
 * Pipeline flow:
 *   Query → [Query Expansion] → [BM25] ──┐
 *                                         ├── [RRF Fusion] → Top-10 → [Claude Reranker] → Top-5
 *   Query → [Vector Search]  ────────────┘
 */

import { DocumentChunk, ChunkMetadata } from '@compliance-analyzer/shared';
import { ChunkModel } from '../models/chunk.model';
import { v4 as uuidv4 } from 'uuid';
import { embeddingService, EMBEDDING_DIMENSION } from './embedding.service';
import { BM25Index, computeTermFrequencies, tokenize, TermFrequencyRecord } from './bm25';
import { aiService } from './ai.service';
import * as dotenv from 'dotenv';
dotenv.config();

// ── Retrieval Configuration ───────────────────────────────────────────────────

/** Number of candidates retrieved from each retriever (BM25, vector) before fusion */
const RETRIEVAL_CANDIDATES = 20;

/** Number of candidates after RRF fusion, before reranking */
const POST_FUSION_CANDIDATES = 10;

/** Final number of chunks returned to the LLM for answer generation */
const FINAL_TOP_K = 5;

/** RRF constant k — controls how much weight is given to lower-ranked results */
const RRF_K = 60;

// ── Utility Functions ─────────────────────────────────────────────────────────

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
 * Reciprocal Rank Fusion (RRF)
 *
 * Combines ranked lists from multiple retrievers into a single ranking.
 * For each document d in ranker r:
 *   RRF(d) = Σ 1 / (k + rank_r(d))
 *
 * Where k is a constant (default 60) that dampens the contribution of
 * low-ranked documents.
 *
 * @see Cormack, G.V., Clarke, C.L.A., & Büttcher, S. (2009).
 *      "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods"
 */
function reciprocalRankFusion(
  ...rankedLists: Array<Array<{ id: string; score: number }>>
): Array<{ id: string; score: number }> {
  const fusedScores = new Map<string, number>();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const { id } = list[rank];
      const rrfScore = 1 / (RRF_K + rank + 1);
      fusedScores.set(id, (fusedScores.get(id) || 0) + rrfScore);
    }
  }

  const results = Array.from(fusedScores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  return results;
}

// ── RAG Service ───────────────────────────────────────────────────────────────

export class RagService {
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
   * Ingest chunks into MongoDB with embeddings and BM25 term frequencies.
   *
   * For each chunk:
   *   1. Generate 384-dim dense embedding via local all-MiniLM-L6-v2
   *   2. Compute BM25 term frequencies (stemmed tokens → counts)
   *   3. Store everything in MongoDB for later retrieval
   */
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    const BATCH_SIZE = 10;
    const docs = [];

    console.log(`[RAG] Storing ${chunks.length} chunks with local embeddings + BM25 term frequencies...`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      // Generate embeddings for this batch
      const embeddings = await embeddingService.embedBatch(batch.map(c => c.text));

      for (let j = 0; j < batch.length; j++) {
        // Compute BM25 term frequencies
        const tf = computeTermFrequencies(batch[j].text);
        const tfRecord: TermFrequencyRecord = {};
        tf.forEach((count, term) => { tfRecord[term] = count; });

        // Compute document length (in stemmed tokens)
        const docLength = tokenize(batch[j].text).length;

        docs.push({
          chunkId: batch[j].id,
          text: batch[j].text,
          metadata: batch[j].metadata,
          embedding: embeddings[j],
          termFrequencies: tfRecord,
          docLength,
        });
      }

      console.log(`[RAG]   Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
    }

    await ChunkModel.insertMany(docs);
    console.log(`[RAG] Successfully stored ${docs.length} chunks in MongoDB`);
  }

  /**
   * Deletes all chunks associated with a specific document ID.
   */
  async deleteChunksForDocument(documentId: string): Promise<void> {
    const result = await ChunkModel.deleteMany({ 'metadata.documentId': documentId });
    console.log(`[RAG] Deleted ${result.deletedCount} chunks for document ${documentId}`);
  }

  /**
   * Multi-Stage Hybrid Retrieval Pipeline
   *
   * Stage 1: BM25 keyword retrieval (top 20)
   * Stage 2: Dense vector retrieval via cosine similarity (top 20)
   * Stage 3: Reciprocal Rank Fusion to merge and score (top 10)
   * Stage 4: Claude cross-encoder reranking (top 5)
   *
   * For gap analysis (empty query), returns all chunks for the document unranked.
   */
  async retrieveChunks(
    query: string,
    filterByDocId?: string,
    topK: number = FINAL_TOP_K
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

    if (candidates.length === 0) return [];

    console.log(`[RAG] Hybrid retrieval for query: "${query.substring(0, 80)}..."`);
    console.log(`[RAG]   Candidate pool: ${candidates.length} chunks`);

    // ── Stage 0: Query Expansion ──────────────────────────────────────────
    let expandedQuery: string;
    try {
      expandedQuery = await aiService.expandQuery(query);
      console.log(`[RAG]   Expanded query: "${expandedQuery.substring(0, 100)}..."`);
    } catch {
      expandedQuery = query;
    }

    // ── Stage 1: BM25 Retrieval ───────────────────────────────────────────
    const bm25Index = new BM25Index();
    bm25Index.buildFromPrecomputed(
      candidates.map((c: any) => ({
        id: c.chunkId,
        termFrequencies: new Map(Object.entries(c.termFrequencies || {})),
        docLength: c.docLength || 0,
      }))
    );
    const bm25Results = bm25Index.score(expandedQuery).slice(0, RETRIEVAL_CANDIDATES);
    console.log(`[RAG]   BM25 retrieved: ${bm25Results.length} chunks`);

    // ── Stage 2: Vector Retrieval ─────────────────────────────────────────
    const queryEmbedding = await embeddingService.embed(query);
    const vectorResults = candidates
      .map((c: any) => ({
        id: c.chunkId as string,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, RETRIEVAL_CANDIDATES);
    console.log(`[RAG]   Vector retrieved: ${vectorResults.length} chunks`);

    // ── Stage 3: Reciprocal Rank Fusion ───────────────────────────────────
    const fusedResults = reciprocalRankFusion(bm25Results, vectorResults)
      .slice(0, POST_FUSION_CANDIDATES);
    console.log(`[RAG]   RRF fused: ${fusedResults.length} chunks`);

    // Build a lookup map for fast chunk retrieval by ID
    const chunkMap = new Map<string, DocumentChunk>();
    for (const c of candidates) {
      chunkMap.set((c as any).chunkId, {
        id: (c as any).chunkId,
        text: (c as any).text,
        metadata: (c as any).metadata,
      });
    }

    // Resolve fused IDs to DocumentChunk objects
    const fusedChunks = fusedResults
      .map(r => chunkMap.get(r.id))
      .filter((c): c is DocumentChunk => c !== undefined);

    // ── Stage 4: Claude Cross-Encoder Reranking ───────────────────────────
    let rerankedChunks: DocumentChunk[];
    try {
      rerankedChunks = await aiService.rerankChunks(query, fusedChunks);
      console.log(`[RAG]   Reranked: ${rerankedChunks.length} chunks`);
    } catch {
      console.warn('[RAG]   Reranking failed, using RRF order');
      rerankedChunks = fusedChunks;
    }

    const finalChunks = rerankedChunks.slice(0, topK);
    console.log(`[RAG]   Final selection: ${finalChunks.length} chunks`);

    return finalChunks;
  }
}

export const ragService = new RagService();
