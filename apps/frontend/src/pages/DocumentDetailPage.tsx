import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  Divider,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  IconButton,
  TextField,
  Paper,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  SmartToy,
  Person,
  FormatQuote,
  Topic,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { fetchDocument, streamQuery } from '../api/client';
import { DocumentMetadata } from '@compliance-analyzer/shared';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { section: string; pageNumber: number; textSnippet: string }[];
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

  useEffect(() => {
    if (!id) return;
    fetchDocument(id)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, querying]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || querying) return;
    
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuerying(true);

    // Prepare a placeholder for the assistant's reply
    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [] }]);

    try {
      await streamQuery(
        q,
        id,
        // onToken: Append token to the last message's content
        (token) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: newMsgs[lastIdx].content + token };
            return newMsgs;
          });
        },
        // onSources: Set the sources for the last message
        (sources) => {
          setMessages((prev) => {
            const newMsgs = [...prev];
            const lastIdx = newMsgs.length - 1;
            newMsgs[lastIdx] = { ...newMsgs[lastIdx], sources };
            return newMsgs;
          });
        },
        // onDone
        () => {
          setQuerying(false);
        },
        // onError
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
        <Skeleton variant="rounded" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout>
        <Alert severity="error">Document not found.</Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Back button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/dashboard')}
        sx={{ mb: 3, color: '#64748b', '&:hover': { backgroundColor: 'transparent', color: '#0f172a' } }}
        disableRipple
      >
        Back to Dashboard
      </Button>

      <Grid container spacing={4}>
        {/* Left: Document Info */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3, boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <Chip
                  label={doc.complianceCategory}
                  size="small"
                  sx={{
                    backgroundColor: doc.complianceCategory === 'Standard' ? '#ecfdf5' : '#e0e7ff',
                    color: doc.complianceCategory === 'Standard' ? '#059669' : '#4338ca',
                    border: `1px solid ${doc.complianceCategory === 'Standard' ? '#a7f3d0' : '#c7d2fe'}`,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3, color: '#0f172a' }}>
                {doc.originalName}
              </Typography>
              <Typography variant="caption" color="#64748b">
                Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Topic sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="subtitle2" fontWeight={600} color="#334155">
                  Key Topics
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {(doc.topics || []).map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    sx={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                      color: '#475569',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FormatQuote sx={{ fontSize: 18, color: '#64748b' }} />
                <Typography variant="subtitle2" fontWeight={600} color="#334155">
                  AI Summary
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.7, color: '#475569' }}>
                {doc.summary || 'No summary available.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Chat */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3, borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SmartToy sx={{ color: '#2563eb' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} color="#0f172a">
                    Document Analysis Q&A
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    Ask questions — responses are grounded in document content with citations
                  </Typography>
                </Box>
              </Box>
            </CardContent>

            {/* Messages */}
            <Box
              ref={scrollRef}
              id="chat-messages-area"
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                minHeight: 400,
                maxHeight: 600,
                backgroundColor: '#ffffff',
              }}
            >
              {messages.length === 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  <Box sx={{ p: 2, borderRadius: '50%', backgroundColor: '#f1f5f9' }}>
                    <SmartToy sx={{ fontSize: 32, color: '#94a3b8' }} />
                  </Box>
                  <Typography variant="body2" color="#64748b">
                    Ask anything about this document…
                  </Typography>
                </Box>
              )}

              {messages.map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: m.role === 'user' ? '#0f172a' : '#eff6ff',
                      color: m.role === 'user' ? '#ffffff' : '#2563eb',
                    }}
                  >
                    {m.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                  </Avatar>
                  <Box sx={{ maxWidth: '75%' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: m.role === 'user' ? '#f1f5f9' : '#ffffff',
                        border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                        {m.content}
                      </Typography>
                    </Paper>

                    {m.sources && m.sources.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {m.sources.map((s, si) => (
                          <Chip
                            key={si}
                            label={`§ ${s.section} (p.${s.pageNumber})`}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 22,
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#64748b',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}

              {querying && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: '#eff6ff', color: '#2563eb' }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                  <CircularProgress size={20} sx={{ color: '#cbd5e1' }} />
                  <Typography variant="caption" color="#94a3b8">
                    Analyzing document…
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Input */}
            <Box
              sx={{
                p: 3,
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                gap: 2,
              }}
            >
              <TextField
                id="chat-input"
                fullWidth
                placeholder="Ask a question about this document…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                size="small"
                multiline
                maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f8fafc',
                  }
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <IconButton
                  id="chat-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || querying}
                  sx={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    borderRadius: 2,
                    p: 1.25,
                    '&:hover': { backgroundColor: '#1e293b' },
                    '&:disabled': { backgroundColor: '#e2e8f0', color: '#94a3b8' },
                  }}
                >
                  <Send sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default DocumentDetailPage;
