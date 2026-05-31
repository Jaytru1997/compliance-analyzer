import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Collapse,
  Divider,
  Skeleton,
  Alert,
} from '@mui/material';
import { Add, FolderOpen, Analytics } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import UploadZone from '../components/UploadZone';
import DocumentCard from '../components/DocumentCard';
import { fetchDocuments } from '../api/client';
import { DocumentMetadata } from '@compliance-analyzer/shared';

const DashboardPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadDocuments = async () => {
    try {
      setError(null);
      const docs = await fetchDocuments();
      // Ensure docs is an array, fallback to empty array if not
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      // backend may not be up yet
      console.error('Failed to fetch documents:', err);
      setDocuments([]);
      setError('Unable to load documents. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleUploaded = (doc: DocumentMetadata) => {
    setDocuments((prev) => [doc, ...prev]);
    setShowUpload(false);
  };

  // Safely filter documents - ensure it's an array
  const procedures = Array.isArray(documents) ? documents.filter((d) => d.complianceCategory === 'Procedure') : [];
  const standards = Array.isArray(documents) ? documents.filter((d) => d.complianceCategory === 'Standard') : [];

  return (
    <AppLayout>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Hero Header */}
      <Box
        sx={{
          mb: 5,
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,185,129,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            top: -100,
            right: -50,
          },
        }}
      >
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ letterSpacing: '-0.5px' }}>
          Compliance Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
          Upload mining safety procedures and recognised standards. Get AI-powered summaries,
          interactive Q&amp;A, and detailed gap analysis reports.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            id="btn-upload-document"
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowUpload((s) => !s)}
          >
            Upload Document
          </Button>
          <Button
            id="btn-go-gap-analysis"
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => navigate('/gap-analysis')}
          >
            Run Gap Analysis
          </Button>
        </Box>
      </Box>

      {/* Upload Zone Collapse */}
      <Collapse in={showUpload}>
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Upload Compliance Document
            </Typography>
            <UploadZone onUploaded={handleUploaded} />
          </CardContent>
        </Card>
      </Collapse>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Documents', value: documents.length, color: '#6366f1' },
          { label: 'ACME Procedures', value: procedures.length, color: '#818cf8' },
          { label: 'Recognised Standards', value: standards.length, color: '#10b981' },
        ].map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 4 }} />

      {/* Documents Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((k) => (
            <Grid item xs={12} sm={6} lg={4} key={k}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : documents.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            opacity: 0.6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <FolderOpen sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography variant="h6" color="text.secondary">
            No documents yet — upload your first one above
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} lg={4} key={doc.id}>
              <DocumentCard doc={doc} />
            </Grid>
          ))}
        </Grid>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
