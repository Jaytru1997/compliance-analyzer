import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { PictureAsPdf, Article, CalendarToday, DeleteOutline } from '@mui/icons-material';
import { DocumentMetadata } from '@compliance-analyzer/shared';
import { useNavigate } from 'react-router-dom';

interface Props {
  doc: DocumentMetadata;
  onDelete?: (id: string) => void;
}

const DocumentCard: React.FC<Props> = ({ doc, onDelete }) => {
  const navigate = useNavigate();
  const isPdf = doc.mimeType === 'application/pdf';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Card
      sx={{
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          borderColor: '#94a3b8',
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
                backgroundColor: isPdf ? '#fef2f2' : '#eff6ff',
                border: `1px solid ${isPdf ? '#fecaca' : '#bfdbfe'}`,
              }}
            >
              {isPdf ? (
                <PictureAsPdf sx={{ color: '#ef4444', fontSize: 22 }} />
              ) : (
                <Article sx={{ color: '#2563eb', fontSize: 22 }} />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tooltip title={doc.originalName}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="#0f172a"
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
                    backgroundColor: doc.complianceCategory === 'Standard' ? '#ecfdf5' : '#e0e7ff',
                    color: doc.complianceCategory === 'Standard' ? '#059669' : '#4338ca',
                    border: `1px solid ${doc.complianceCategory === 'Standard' ? '#a7f3d0' : '#c7d2fe'}`,
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 20,
                  }}
                />
              </Box>
            </Box>

            {onDelete && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
                sx={{
                  color: '#94a3b8',
                  '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' },
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Summary */}
          {doc.summary && (
            <Typography
              variant="body2"
              color="#475569"
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
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.65rem',
                    height: 18,
                    color: '#64748b',
                  }}
                />
              ))}
              {doc.topics.length > 4 && (
                <Chip
                  label={`+${doc.topics.length - 4}`}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: 18, backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid transparent' }}
                />
              )}
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 12, color: '#94a3b8' }} />
            <Typography variant="caption" color="#64748b">
              {formatDate(doc.uploadDate)}
            </Typography>
            <Typography variant="caption" color="#64748b" sx={{ ml: 'auto' }}>
              {(doc.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default DocumentCard;
