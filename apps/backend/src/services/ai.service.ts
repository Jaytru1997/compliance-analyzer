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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    try {
      return JSON.parse(content);
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
      model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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

Output the result strictly as a JSON array matching this schema without any markdown formatting:
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
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '[]';
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse gap analysis JSON', content);
      return [];
    }
  }
}

export const aiService = new AiService();
