import axios from 'axios';
import { DocumentMetadata, GapAnalysisResponse } from '@compliance-analyzer/shared';

const api = axios.create({ baseURL: '/api' });

// ── Auth ────────────────────────────────────────────────
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; username: string }> => {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
};

// ── Documents ───────────────────────────────────────────
export const uploadDocument = async (
  file: File,
  category: 'Standard' | 'Procedure'
): Promise<DocumentMetadata> => {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  const { data } = await api.post<DocumentMetadata>('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const fetchDocuments = async (): Promise<DocumentMetadata[]> => {
  const { data } = await api.get<DocumentMetadata[]>('/documents');
  return data;
};

export const fetchDocument = async (id: string): Promise<DocumentMetadata> => {
  const { data } = await api.get<DocumentMetadata>(`/documents/${id}`);
  return data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

export const fetchDocumentContent = async (id: string): Promise<{ id: string; originalName: string; fullText: string }> => {
  const { data } = await api.get(`/documents/${id}/content`);
  return data;
};

// ── Chat (Streaming) ─────────────────────────────────────
export interface ChatSource {
  section: string;
  pageNumber: number;
  textSnippet: string;
}

/**
 * Streams a Q&A response from the backend via Server-Sent Events.
 * @param query - The user's question
 * @param documentId - Optional document scope
 * @param onToken - Called with each text fragment as it arrives
 * @param onSources - Called once with the citation array (arrives before tokens)
 * @param onDone - Called when the stream is finished
 * @param onError - Called if an error occurs mid-stream
 */
export const streamQuery = async (
  query: string,
  documentId: string | undefined,
  onToken: (token: string) => void,
  onSources: (sources: ChatSource[]) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> => {
  const response = await fetch('/api/chat/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, documentId }),
  });

  if (!response.ok || !response.body) {
    onError('Request failed');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? ''; // keep incomplete last chunk

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6); // strip "data: "

      if (payload === '[DONE]') {
        onDone();
        return;
      }
      if (payload === '[ERROR]') {
        onError('Stream error from server');
        return;
      }
      if (payload.startsWith('[SOURCES] ')) {
        try {
          const sources: ChatSource[] = JSON.parse(payload.slice(10));
          onSources(sources);
        } catch { /* ignore parse errors */ }
        continue;
      }
      // Regular text token — unescape the newlines we encoded server-side
      onToken(payload.replace(/\\n/g, '\n'));
    }
  }
  onDone();
};

// ── Gap Analysis ─────────────────────────────────────────
export const runGapAnalysis = async (
  standardDocId: string,
  procedureDocId: string
): Promise<GapAnalysisResponse> => {
  const { data } = await api.post<GapAnalysisResponse>('/gap-analysis', {
    standardDocId,
    procedureDocId,
  });
  return data;
};
