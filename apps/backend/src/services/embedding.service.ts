/**
 * Local Embedding Service
 *
 * Generates 384-dimensional dense vector embeddings using the
 * `Xenova/all-MiniLM-L6-v2` model via Transformers.js (ONNX Runtime).
 *
 * Key advantages over external API-based embeddings:
 *   - Zero API cost — runs entirely in-process
 *   - Zero latency — no network round-trip
 *   - Zero dependency on external service availability
 *   - Deterministic — same input always produces the same vector
 *
 * The model is loaded lazily on first call and cached in memory (~30MB).
 * Subsequent calls reuse the cached pipeline.
 *
 * @see https://huggingface.co/Xenova/all-MiniLM-L6-v2
 */

// Dynamic import types — Transformers.js uses ESM
let pipelineFactory: any = null;

/** Embedding output dimension for all-MiniLM-L6-v2 */
export const EMBEDDING_DIMENSION = 384;

/**
 * Singleton embedding pipeline.
 * Lazily initialized on first call to embed().
 */
let embeddingPipeline: any = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the embedding model.
 * Uses dynamic import since @xenova/transformers is ESM-only.
 */
async function initialize(): Promise<void> {
  if (embeddingPipeline) return;

  console.log('[Embedding] Loading local model: Xenova/all-MiniLM-L6-v2...');
  const startTime = Date.now();

  try {
    // Dynamic import for ESM compatibility
    const { pipeline, env } = await import('@xenova/transformers');

    // Disable local model check to force download from HuggingFace Hub on first run
    env.allowLocalModels = false;

    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Embedding] Model loaded successfully in ${elapsed}s (${EMBEDDING_DIMENSION}-dim)`);
  } catch (err) {
    console.error('[Embedding] Failed to load model:', err);
    throw new Error('Failed to initialize local embedding model');
  }
}

/**
 * Ensure the model is initialized (thread-safe via shared promise).
 */
async function ensureInitialized(): Promise<void> {
  if (embeddingPipeline) return;
  if (!initPromise) {
    initPromise = initialize();
  }
  await initPromise;
}

export class EmbeddingService {
  /**
   * Generate a 384-dimensional embedding for a single text string.
   *
   * The text is truncated to 512 tokens (model's max context) and
   * mean-pooled across all token embeddings to produce a single vector.
   */
  async embed(text: string): Promise<number[]> {
    await ensureInitialized();

    // Clean and truncate input text
    const cleaned = text.replace(/\n/g, ' ').trim().substring(0, 8000);

    const output = await embeddingPipeline(cleaned, {
      pooling: 'mean',
      normalize: true,
    });

    // Output is a Tensor — convert to flat array
    return Array.from(output.data as Float32Array).slice(0, EMBEDDING_DIMENSION);
  }

  /**
   * Generate embeddings for multiple texts in sequence.
   * Processes one at a time to avoid OOM on large batches.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  /**
   * Check if the embedding model is loaded and ready.
   */
  isReady(): boolean {
    return embeddingPipeline !== null;
  }
}

/** Singleton instance */
export const embeddingService = new EmbeddingService();
