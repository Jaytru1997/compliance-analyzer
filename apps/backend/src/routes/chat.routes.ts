import { Router } from 'express';
import { ragService } from '../services/rag.service';
import { aiService } from '../services/ai.service';

const router = Router();

/**
 * POST /api/chat/query
 * Streams the Claude response token-by-token via Server-Sent Events (SSE).
 *
 * The client must read the stream and handle these event types:
 *  - `data: <token>\n\n`  — a text fragment to append
 *  - `data: [SOURCES] {...}\n\n` — JSON payload with citation metadata
 *  - `data: [DONE]\n\n`   — stream is complete
 *  - `data: [ERROR]\n\n`  — an error occurred
 */
router.post('/query', async (req, res) => {
  try {
    const { query, documentId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 1. Retrieve relevant context chunks (vector or keyword)
    const chunks = await ragService.retrieveChunks(query, documentId, 5);

    // 2. Send citation metadata as the first SSE event so the client
    //    can render source chips before the text even arrives.
    const sources = chunks.map(c => ({
      section: c.metadata.section,
      pageNumber: c.metadata.pageNumber,
      textSnippet: c.text.substring(0, 150) + '...',
    }));

    // SSE headers are set inside streamAnswer() — set the sources event first
    // by calling setHeader before any write happens.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send sources metadata as the first event
    res.write(`data: [SOURCES] ${JSON.stringify(sources)}\n\n`);

    // 3. Stream Claude response tokens — this takes over the response lifecycle
    await aiService.streamAnswer(query, chunks, res);

  } catch (error: any) {
    console.error('[Chat Route]', error);
    // If headers not sent yet, send JSON error; otherwise inject into stream
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write('data: [ERROR]\n\n');
      res.end();
    }
  }
});

export default router;
