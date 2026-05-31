import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!id) return;
    fetchDocument(id)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Skeleton variant="rounded" height={200} sx={{ mb: 3, borderRadius: 3 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
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
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        Back to Dashboard
      </Button>

      <Grid container spacing={4}>
        {/* Left: Document Info */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <Chip
                  label={doc.complianceCategory}
                  size="small"
                  sx={{
                    background: doc.complianceCategory === 'Standard'
                      ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                    color: doc.complianceCategory === 'Standard' ? '#34d399' : '#818cf8',
                    border: `1px solid ${doc.complianceCategory === 'Standard' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
                {doc.originalName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
              </Typography>

              <Divider sx={{ my: 2.5 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Topic sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>
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
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '0.7rem',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <FormatQuote sx={{ fontSize: 18, color: 'secondary.main' }} />
                <Typography variant="subtitle2" fontWeight={600}>
                  AI Summary
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {doc.summary || 'No summary available.'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Chat */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SmartToy sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Document Q&A
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ask questions — responses are grounded in document content with citations
                  </Typography>
                </Box>
              </Box>
            </CardContent>

            {/* Messages */}
            <Box
              id="chat-messages-area"
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 320,
                maxHeight: 480,
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
                    opacity: 0.5,
                    gap: 1,
                  }}
                >
                  <SmartToy sx={{ fontSize: 48 }} />
                  <Typography variant="body2" color="text.secondary">
                    Ask anything about this document…
                  </Typography>
                </Box>
              )}

              {messages.map((m, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: m.role === 'user' ? 'primary.dark' : 'secondary.dark',
                      fontSize: '0.75rem',
                    }}
                  >
                    {m.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                  </Avatar>
                  <Box sx={{ maxWidth: '80%' }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        background:
                          m.role === 'user'
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.15))'
                            : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </Typography>
                    </Paper>

                    {m.sources && m.sources.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {m.sources.map((s, si) => (
                          <Chip
                            key={si}
                            label={`§ ${s.section} (p.${s.pageNumber})`}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              color: '#34d399',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}

              {querying && (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.dark' }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                  <CircularProgress size={20} />
                  <Typography variant="caption" color="text.secondary">
                    Analyzing document…
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Input */}
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                gap: 1.5,
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
                maxRows={3}
              />
              <IconButton
                id="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || querying}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  color: '#fff',
                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
                  '&:disabled': { background: 'rgba(255,255,255,0.08)', color: 'text.secondary' },
                }}
              >
                <Send sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
};

export default DocumentDetailPage;
