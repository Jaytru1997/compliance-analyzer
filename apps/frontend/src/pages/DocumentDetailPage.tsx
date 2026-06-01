import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  User, 
  Quote, 
  Hash, 
  FileText,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AppLayout from '../components/AppLayout';
import { fetchDocument, streamQuery, fetchDocumentContent } from '../api/client';
import { DocumentMetadata } from '@compliance-analyzer/shared';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { section: string; pageNumber: number; textSnippet: string }[];
}

function extractCitationsFromContent(content: string): {
  cleanContent: string;
  citations: { section: string; pageNumber: number }[];
} {
  const citations: { section: string; pageNumber: number }[] = [];
  let cleanContent = content;

  const citationRegex = /\[Citation:\s*([^\(\[\]]*?)\s*\(\s*(?:Page|p\.?)\s*(\d+)\]?\]?/gi;

  let match;
  while ((match = citationRegex.exec(content)) !== null) {
    const section = match[1].trim() || 'Referenced Section';
    const pageNumber = parseInt(match[2], 10);

    if (!isNaN(pageNumber)) {
      citations.push({ section, pageNumber });
    }
  }

  cleanContent = content.replace(/\[Citation:[^\[\]]*?\([^)]*(?:Page|p\.?)[^\)]*\]?\]?/gi, '').trim();

  return { cleanContent, citations };
}

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [querying, setQuerying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [fullText, setFullText] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDocument(id)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, querying]);

  useEffect(() => {
    if (activeTab === 1 && id && !fullText && !loadingContent) {
      setLoadingContent(true);
      fetchDocumentContent(id)
        .then((data) => setFullText(data.fullText))
        .catch((err) => {
          console.error('Failed to load document content:', err);
          setFullText(null);
        })
        .finally(() => setLoadingContent(false));
    }
  }, [activeTab, id, fullText, loadingContent]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || querying) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuerying(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [] }]);

    try {
      await streamQuery(
        q,
        id,
        (token) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + token };
            return newMsgs;
          });
        },
        (sources) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], sources };
            return newMsgs;
          });
        },
        () => {
          setQuerying(false);
        },
        (errStr) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = {
              ...newMsgs[lastIdx],
              content: newMsgs[lastIdx].content + `\n\n[Error: ${errStr}]`
            };
            return newMsgs;
          });
          setQuerying(false);
        }
      );
    } catch (err: any) {
      console.error(err);
      setQuerying(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="mb-6 h-[200px] animate-pulse rounded-2xl bg-surface-200"></div>
        <div className="h-[400px] animate-pulse rounded-2xl bg-surface-200"></div>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout>
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p>Document not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Document Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                doc.complianceCategory === 'Standard'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
              }`}>
                {doc.complianceCategory}
              </span>
            </div>
            <h1 className="mb-2 text-2xl font-bold leading-tight tracking-tight text-surface-900">
              {doc.originalName}
            </h1>
            <p className="text-xs text-surface-500">
              Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
            </p>

            <hr className="my-6 border-surface-200" />

            <div className="mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">Key Topics</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(doc.topics || []).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md bg-surface-50 px-2.5 py-1 text-xs font-medium text-surface-600 ring-1 ring-inset ring-surface-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <Quote className="h-4 w-4 text-surface-400" />
              <h3 className="text-sm font-semibold text-surface-700">AI Summary</h3>
            </div>
            <p className="text-sm leading-relaxed text-surface-600">
              {doc.summary || 'No summary available.'}
            </p>
          </div>
        </div>

        {/* Right: Chat / Document Content */}
        <div className="lg:col-span-8 flex flex-col glass-card h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-surface-200 bg-surface-50">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === 0
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-700'
              }`}
            >
              <Bot className="h-4 w-4" />
              Q&A Analysis
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === 1
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:bg-surface-100 hover:text-surface-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              Full Document
            </button>
          </div>

          {/* Tab Content: Q&A Analysis */}
          {activeTab === 0 && (
            <>
              <div className="border-b border-surface-200 bg-surface-50/50 p-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary-600" />
                  <div>
                    <h2 className="text-sm font-semibold text-surface-900">Document Analysis Q&A</h2>
                    <p className="text-xs text-surface-500">Ask questions — responses are grounded in document content with citations</p>
                  </div>
                </div>
              </div>
              
              <div
                ref={scrollRef}
                id="chat-messages-area"
                className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white space-y-6"
              >
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <div className="rounded-full bg-surface-100 p-4">
                      <Bot className="h-8 w-8 text-surface-400" />
                    </div>
                    <p className="text-sm text-surface-500">Ask anything about this document…</p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.role === 'user' ? 'bg-surface-900 text-white' : 'bg-primary-50 text-primary-600'
                    }`}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    
                    <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm ${
                        m.role === 'user'
                          ? 'bg-surface-100 text-surface-900'
                          : 'border border-surface-200 bg-white text-surface-800 shadow-sm prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-surface-50 prose-pre:border prose-pre:border-surface-200'
                      }`}>
                        {m.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <ReactMarkdown>{extractCitationsFromContent(m.content).cleanContent}</ReactMarkdown>
                        )}
                      </div>

                      {m.role === 'assistant' && (() => {
                        const { citations: extractedCitations } = extractCitationsFromContent(m.content);
                        const allSources = [...(m.sources || []), ...extractedCitations];
                        const uniqueSources = Array.from(
                          new Map(
                            allSources.map((s) => [`${s.section}-${s.pageNumber}`, s])
                          ).values()
                        );

                        return (
                          uniqueSources.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {uniqueSources.map((s, si) => (
                                <span
                                  key={si}
                                  className="inline-flex items-center rounded-md bg-surface-50 px-2 py-1 text-[10px] font-medium text-surface-600 ring-1 ring-inset ring-surface-200"
                                >
                                  § {s.section} (p.{s.pageNumber})
                                </span>
                              ))}
                            </div>
                          )
                        );
                      })()}
                    </div>
                  </div>
                ))}

                {querying && (
                  <div className="flex items-center gap-3 text-surface-500">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-surface-300" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-surface-300" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-surface-300" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-surface-200 bg-white p-4">
                <div className="flex items-end gap-3 rounded-xl border border-surface-200 bg-surface-50 p-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                  <textarea
                    id="chat-input"
                    rows={1}
                    className="max-h-[120px] min-h-[40px] w-full resize-none border-none bg-transparent px-2 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-0"
                    placeholder="Ask a question about this document…"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    id="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || querying}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-900 text-white transition-colors hover:bg-surface-800 disabled:bg-surface-200 disabled:text-surface-400"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tab Content: Full Document */}
          {activeTab === 1 && (
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {loadingContent ? (
                <div className="space-y-4">
                  <div className="h-48 animate-pulse rounded-xl bg-surface-100"></div>
                  <div className="h-48 animate-pulse rounded-xl bg-surface-100"></div>
                  <div className="h-48 animate-pulse rounded-xl bg-surface-100"></div>
                </div>
              ) : fullText ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-6 font-mono text-sm leading-relaxed text-surface-700 whitespace-pre-wrap break-words">
                  {fullText}
                </div>
              ) : (
                <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800 ring-1 ring-yellow-200">
                  Unable to load document content
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentDetailPage;
