import Anthropic from '@anthropic-ai/sdk';
import { DocumentChunk, GapAnalysisFinding } from '@compliance-analyzer/shared';
import { Response } from 'express';
import * as dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AiService {
  /**
   * Generates a summary and topic extraction for a document.
   */
  async summarizeDocument(text: string): Promise<{ summary: string; topics: string[] }> {
    const MAX_CHARS = 50000;
    const prompt = `You are a senior mining safety compliance auditor. 
Analyze the provided document text and generate a concise summary in plain English.
Additionally, extract a list of 5-10 key topics or compliance categories covered in the text.
Return the output strictly in the following JSON format without any markdown wrapper:
{
  "summary": "...",
  "topics": ["...", "..."]
}

Document Text:
${text.substring(0, MAX_CHARS)}
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    try {
      // Strip markdown code fences (```json ... ```) if present
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse summary JSON', content);
      return { summary: 'Failed to generate summary.', topics: [] };
    }
  }

  /**
   * Answers a query based strictly on retrieved context.
   */
  async answerQuery(query: string, contextChunks: DocumentChunk[]): Promise<string> {
    const contextText = contextChunks.map(c => `[Citation: ${c.metadata.section} (Page ${c.metadata.pageNumber})]\n${c.text}`).join('\n\n');

    const prompt = `You are a senior mining safety compliance auditor.
Answer the user's question using ONLY the provided document context.
For every claim or requirement you state, you MUST provide a citation referencing the source section or page number provided in the context metadata.
If the answer cannot be found in the context, state: "The provided documents do not contain information to answer this question."
Do not use outside knowledge.

Context:
<context>
${contextText}
</context>

Question: ${query}
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  /**
   * Streaming version of answerQuery.
   * Pipes Claude token-by-token into an Express SSE response.
   * SSE format: each event is `data: <token>\n\n`, terminated with `data: [DONE]\n\n`.
   */
  async streamAnswer(
    query: string,
    contextChunks: DocumentChunk[],
    res: Response
  ): Promise<void> {
    const contextText = contextChunks
      .map(c => `[Citation: ${c.metadata.section} (Page ${c.metadata.pageNumber})]\n${c.text}`)
      .join('\n\n');

    const prompt = `You are a senior mining safety compliance auditor.
Answer the user's question using ONLY the provided document context.
For every claim or requirement you state, you MUST provide a citation referencing the source section or page number provided in the context metadata.
If the answer cannot be found in the context, state: "The provided documents do not contain information to answer this question."
Do not use outside knowledge.

Context:
<context>
${contextText}
</context>

Question: ${query}
`;

    // Set SSE headers only if the route hasn't already sent them
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
    }

    try {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        temperature: 0.0,
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          // Escape newlines within the token so SSE framing stays intact
          const token = chunk.delta.text.replace(/\n/g, '\\n');
          res.write(`data: ${token}\n\n`);
        }
      }

      // Signal end of stream to the client
      res.write('data: [DONE]\n\n');
    } catch (err) {
      console.error('[AI] Streaming error:', err);
      res.write('data: [ERROR]\n\n');
    } finally {
      res.end();
    }
  }

  /**
   * Cross-Encoder Reranking via Claude
   *
   * Given a query and a set of candidate chunks, Claude scores each chunk's
   * relevance on a 0-10 scale. This is the "cross-encoder" pattern used by
   * Cohere Rerank, Jina Reranker, and other production RAG systems.
   *
   * Cross-encoders are more accurate than bi-encoders (embedding similarity)
   * because they jointly attend to both the query and the document, capturing
   * nuanced semantic relationships that vector similarity misses.
   *
   * @param query - The user's original question
   * @param chunks - Candidate chunks from the hybrid retrieval stage
   * @returns Chunks sorted by relevance score descending
   */
  async rerankChunks(
    query: string,
    chunks: DocumentChunk[]
  ): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];
    if (chunks.length <= 2) return chunks; // Not worth the API call

    const chunkDescriptions = chunks
      .map((c, i) => `[Chunk ${i}] (Section: ${c.metadata.section}, Page ${c.metadata.pageNumber})\n${c.text.substring(0, 500)}`)
      .join('\n\n---\n\n');

    const prompt = `You are a mining safety compliance document retrieval expert.

Given a user query and a set of document chunks, score each chunk's relevance to the query on a scale of 0-10.
- 10 = directly answers the query with specific, actionable information
- 7-9 = highly relevant, contains key information related to the query
- 4-6 = somewhat relevant, mentions related topics but doesn't directly answer
- 1-3 = marginally relevant, only tangentially related
- 0 = completely irrelevant

Return ONLY a JSON array of scores in the same order as the chunks, without any markdown formatting:
[score0, score1, score2, ...]

User Query: "${query}"

Document Chunks:
${chunkDescriptions}
`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        temperature: 0.0,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawContent = response.content[0].type === 'text' ? response.content[0].text : '[]';
      // Strip markdown code fences if present
      const cleanedContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const scores: number[] = JSON.parse(cleanedContent);

      // Pair each chunk with its score and sort descending
      const scored = chunks.map((chunk, i) => ({
        chunk,
        score: scores[i] ?? 0,
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored.map(s => s.chunk);
    } catch (err) {
      console.error('[AI] Reranking failed, returning original order:', err);
      return chunks; // Graceful degradation — return unranked results
    }
  }

  /**
   * Query Expansion via Claude
   *
   * Generates alternative phrasings and domain-specific synonyms for a query
   * to improve BM25 recall. This compensates for the vocabulary mismatch problem
   * (e.g., user says "PPE" but the document says "Personal Protective Equipment").
   *
   * @param query - The user's original question
   * @returns Expanded query string combining original + generated terms
   */
  async expandQuery(query: string): Promise<string> {
    const prompt = `You are a mining safety compliance terminology expert.

Given the following user query, generate 3-5 alternative phrasings or related technical terms that would help find relevant passages in mining safety compliance documents.

Include:
- Acronym expansions (e.g., PPE → Personal Protective Equipment)
- Technical synonyms (e.g., "hazard" → "risk", "danger")
- Related compliance terms (e.g., "inspection" → "audit", "verification", "check")

Return ONLY the additional terms/phrases as a space-separated string, without the original query, and without any markdown formatting.

Query: "${query}"`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        temperature: 0.0,
        messages: [{ role: 'user', content: prompt }],
      });

      const expansion = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      return `${query} ${expansion}`;
    } catch (err) {
      console.error('[AI] Query expansion failed, using original query:', err);
      return query; // Graceful degradation
    }
  }

  /**
   * Performs Gap Analysis between a Standard and a Procedure.
   */
  async performGapAnalysis(standardText: string, procedureText: string): Promise<GapAnalysisFinding[]> {
    const prompt = `You are a senior mining safety compliance auditor with 20 years of experience.
Your task is to perform a strict gap analysis between an ACME Site Procedure and a Recognised Standard.

Compare the provided texts and identify:
1. Full Compliance: Where the procedure fully meets the standard.
2. Partial Gaps: Where the procedure addresses the standard but lacks specific details or rigor.
3. Full Gaps: Where a requirement in the standard is entirely missing from the procedure.

For each finding, provide:
- Requirement Description
- Citation from the Standard
- Citation from the Procedure (or "Not found")
- Severity (High/Medium/Low)
- Recommended Action

IMPORTANT: Output ONLY a raw JSON array. Do NOT wrap it in markdown code fences. Do NOT use \`\`\`json. Start directly with [ and end with ].

Schema:
[
  {
    "type": "Full Gap" | "Partial Gap" | "Full Compliance",
    "requirement": "string",
    "standardCitation": "string",
    "procedureCitation": "string",
    "severity": "High" | "Medium" | "Low",
    "recommendation": "string"
  }
]

Standard Text:
<standard>
${standardText}
</standard>

Procedure Text:
<procedure>
${procedureText}
</procedure>
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '[]';
    return this.parseJsonArray(rawContent);
  }

  /**
   * Robustly extracts a JSON array from Claude's response text.
   *
   * Handles three common failure modes:
   *   1. Markdown code fences (```json ... ```)
   *   2. Preamble text before the array
   *   3. Truncated output (unclosed brackets/braces) from max_tokens limits
   */
  private parseJsonArray(raw: string): GapAnalysisFinding[] {
    // Step 1: Strip markdown code fences if present
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```\s*$/i, '');
    cleaned = cleaned.trim();

    // Step 2: Find the start of the JSON array
    const arrayStart = cleaned.indexOf('[');
    if (arrayStart === -1) {
      console.error('[AI] No JSON array found in gap analysis response');
      return [];
    }
    cleaned = cleaned.substring(arrayStart);

    // Step 3: Try direct parse first
    try {
      return JSON.parse(cleaned);
    } catch {
      // Step 4: Response may be truncated — try to repair by closing open structures
      console.warn('[AI] Direct JSON parse failed, attempting truncation repair...');
    }

    // Step 5: Truncation repair — find the last complete object and close the array
    const lastCompleteObject = cleaned.lastIndexOf('}');
    if (lastCompleteObject === -1) {
      console.error('[AI] No complete JSON object found in gap analysis response');
      return [];
    }

    const repaired = cleaned.substring(0, lastCompleteObject + 1) + '\n]';
    try {
      const results = JSON.parse(repaired);
      console.log(`[AI] Truncation repair succeeded — recovered ${results.length} findings`);
      return results;
    } catch (e) {
      console.error('[AI] Truncation repair also failed:', e);
      console.error('[AI] First 500 chars of raw response:', raw.substring(0, 500));
      return [];
    }
  }
}

export const aiService = new AiService();
