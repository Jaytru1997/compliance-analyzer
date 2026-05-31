import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import { PictureAsPdf, Article, CalendarToday } from '@mui/icons-material';
import { DocumentMetadata } from '@compliance-analyzer/shared';
import { useNavigate } from 'react-router-dom';

interface Props {
  doc: DocumentMetadata;
}

const DocumentCard: React.FC<Props> = ({ doc }) => {
  const navigate = useNavigate();
  const isPdf = doc.mimeType === 'application/pdf';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Card
      sx={{
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          borderColor: 'rgba(99,102,241,0.4)',
        },
      }}
    >
      <CardActionArea onClick={() => navigate(`/documents/${doc.id}`)}>
        <CardContent sx={{ p: 3 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 2,
                flexShrink: 0,
                background: isPdf
                  ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))'
                  : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.08))',
                border: `1px solid ${isPdf ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
              }}
            >
              {isPdf ? (
                <PictureAsPdf sx={{ color: '#ef4444', fontSize: 22 }} />
              ) : (
                <Article sx={{ color: '#6366f1', fontSize: 22 }} />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tooltip title={doc.originalName}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {doc.originalName}
                </Typography>
              </Tooltip>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={doc.complianceCategory}
                  size="small"
                  sx={{
                    background:
                      doc.complianceCategory === 'Standard'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(99,102,241,0.15)',
                    color:
                      doc.complianceCategory === 'Standard' ? '#34d399' : '#818cf8',
                    border: `1px solid ${
                      doc.complianceCategory === 'Standard'
                        ? 'rgba(16,185,129,0.3)'
                        : 'rgba(99,102,241,0.3)'
                    }`,
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 20,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Summary */}
          {doc.summary && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.55,
              }}
            >
              {doc.summary}
            </Typography>
          )}

          {/* Topics */}
          {doc.topics && doc.topics.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
              {doc.topics.slice(0, 4).map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  sx={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.65rem',
                    height: 18,
                    color: 'text.secondary',
                  }}
                />
              ))}
              {doc.topics.length > 4 && (
                <Chip
                  label={`+${doc.topics.length - 4}`}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: 18, opacity: 0.5 }}
                />
              )}
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(doc.uploadDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {(doc.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default DocumentCard;
