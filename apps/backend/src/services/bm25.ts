/**
 * Okapi BM25 Ranking Engine
 *
 * Industry-standard probabilistic retrieval function used by Elasticsearch,
 * Apache Lucene, and Azure AI Search. Scores documents based on term frequency,
 * inverse document frequency, and document length normalization.
 *
 * Parameters:
 *   k1 = 1.5  — controls term frequency saturation
 *   b  = 0.75 — controls document length normalization
 *
 * @see Robertson, S.E., & Walker, S. (1994). "Some Simple Effective
 *      Approximations to the 2-Poisson Model"
 */

// ── Stopwords (augmented with mining/compliance domain terms that are too common) ──
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  'and', 'but', 'or', 'nor', 'not', 'so', 'if', 'then', 'than',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
  'into', 'about', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
  'also', 'just', 'only', 'very', 'too', 'more', 'most', 'some', 'any',
  'all', 'each', 'every', 'both', 'few', 'many', 'much', 'such',
  'no', 'nor', 'own', 'same', 'other',
]);

/**
 * Lightweight Porter Stemmer (simplified).
 * Strips common English suffixes to normalize word forms.
 * e.g., "requirements" → "requir", "inspection" → "inspect"
 */
function porterStem(word: string): string {
  let w = word;

  // Step 1a: plurals / past tenses
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('ss')) { /* keep */ }
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);

  // Step 1b: -eed, -ed, -ing
  if (w.endsWith('eed') && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);

  // Step 2: common suffixes
  if (w.endsWith('ational')) w = w.slice(0, -5) + 'e';
  else if (w.endsWith('tion')) w = w.slice(0, -4) + 'te';
  else if (w.endsWith('ation')) w = w.slice(0, -5) + 'e';
  else if (w.endsWith('ment') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ness') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ence') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ance') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('able') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ible') && w.length > 6) w = w.slice(0, -4);
  else if (w.endsWith('ful') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ous') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ive') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ly') && w.length > 4) w = w.slice(0, -2);

  return w;
}

/**
 * Tokenize, lowercase, remove stopwords, and stem a text string.
 * Returns an array of stemmed tokens.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
    .map(porterStem);
}

/**
 * Compute raw term frequencies for a text.
 * Returns a Map of stemmed term → count.
 */
export function computeTermFrequencies(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

/** Serializable term frequency record for MongoDB storage */
export interface TermFrequencyRecord {
  [term: string]: number;
}

/**
 * Okapi BM25 Index
 *
 * Maintains an inverted index with IDF weights and average document length
 * for fast BM25 scoring at query time.
 */
export class BM25Index {
  /** BM25 tuning parameters */
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  /** Corpus statistics */
  private documentCount = 0;
  private averageDocLength = 0;

  /** Inverted index: term → Set of document indices that contain it */
  private readonly invertedIndex = new Map<string, Set<number>>();

  /** Per-document data */
  private readonly documents: Array<{
    id: string;
    termFrequencies: Map<string, number>;
    docLength: number;
  }> = [];

  /**
   * Build the BM25 index from a set of documents.
   * Each document is a { id, text } or { id, termFrequencies, docLength }.
   */
  buildFromDocuments(docs: Array<{ id: string; text: string }>): void {
    this.documents.length = 0;
    this.invertedIndex.clear();
    this.documentCount = docs.length;

    let totalLength = 0;

    for (let i = 0; i < docs.length; i++) {
      const tokens = tokenize(docs[i].text);
      const tf = new Map<string, number>();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
      }

      this.documents.push({
        id: docs[i].id,
        termFrequencies: tf,
        docLength: tokens.length,
      });

      totalLength += tokens.length;

      // Build inverted index
      for (const term of tf.keys()) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, new Set());
        }
        this.invertedIndex.get(term)!.add(i);
      }
    }

    this.averageDocLength = this.documentCount > 0 ? totalLength / this.documentCount : 0;
  }

  /**
   * Build the BM25 index from pre-computed term frequencies (loaded from MongoDB).
   */
  buildFromPrecomputed(
    docs: Array<{
      id: string;
      termFrequencies: Map<string, number>;
      docLength: number;
    }>
  ): void {
    this.documents.length = 0;
    this.invertedIndex.clear();
    this.documentCount = docs.length;

    let totalLength = 0;

    for (let i = 0; i < docs.length; i++) {
      this.documents.push(docs[i]);
      totalLength += docs[i].docLength;

      for (const term of docs[i].termFrequencies.keys()) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, new Set());
        }
        this.invertedIndex.get(term)!.add(i);
      }
    }

    this.averageDocLength = this.documentCount > 0 ? totalLength / this.documentCount : 0;
  }

  /**
   * Compute IDF for a term using the Robertson-Spärck Jones formula:
   *   IDF(t) = ln((N - df(t) + 0.5) / (df(t) + 0.5) + 1)
   *
   * Where N = total documents, df(t) = documents containing term t.
   */
  private idf(term: string): number {
    const df = this.invertedIndex.get(term)?.size ?? 0;
    return Math.log(
      (this.documentCount - df + 0.5) / (df + 0.5) + 1
    );
  }

  /**
   * Score a query against all indexed documents.
   * Returns results sorted by BM25 score descending.
   *
   * BM25(D, Q) = Σ IDF(qi) · (f(qi, D) · (k1 + 1)) / (f(qi, D) + k1 · (1 - b + b · |D|/avgdl))
   */
  score(query: string): Array<{ id: string; score: number }> {
    const queryTerms = tokenize(query);
    const results: Array<{ id: string; score: number }> = [];

    for (let i = 0; i < this.documents.length; i++) {
      const doc = this.documents[i];
      let score = 0;

      for (const term of queryTerms) {
        const tf = doc.termFrequencies.get(term) || 0;
        if (tf === 0) continue;

        const idfValue = this.idf(term);
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf + this.k1 * (1 - this.b + this.b * (doc.docLength / this.averageDocLength));

        score += idfValue * (numerator / denominator);
      }

      if (score > 0) {
        results.push({ id: doc.id, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }
}
