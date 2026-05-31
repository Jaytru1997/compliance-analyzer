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
import { Add, FolderOpen, Analytics, UploadFile } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import UploadZone from '../components/UploadZone';
import DocumentCard from '../components/DocumentCard';
import { fetchDocuments, deleteDocument } from '../api/client';
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

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError('Failed to delete document.');
    }
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

      {/* Hero Header - Analytical, Clean */}
      <Box sx={{ mb: 5, pt: 2 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ letterSpacing: '-0.02em', color: '#0f172a' }}>
          Compliance Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#475569', mb: 3, maxWidth: 640, fontSize: '1.1rem' }}>
          Upload mining safety procedures and recognised standards to analyze gaps and run interactive compliance Q&amp;A.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            id="btn-upload-document"
            variant="contained"
            color="primary"
            startIcon={<UploadFile />}
            onClick={() => setShowUpload((s) => !s)}
          >
            Upload Document
          </Button>
          <Button
            id="btn-go-gap-analysis"
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => navigate('/gap-analysis')}
            sx={{ borderColor: '#cbd5e1', color: '#334155', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
          >
            Run Gap Analysis
          </Button>
        </Box>
      </Box>

      {/* Upload Zone Collapse */}
      <Collapse in={showUpload}>
        <Card sx={{ mb: 4, borderStyle: 'dashed', backgroundColor: '#fafaf9' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom color="#1c1917">
              Upload Compliance Document
            </Typography>
            <UploadZone onUploaded={handleUploaded} />
          </CardContent>
        </Card>
      </Collapse>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {[
          { label: 'Total Documents', value: documents.length },
          { label: 'ACME Procedures', value: procedures.length },
          { label: 'Recognised Standards', value: standards.length },
        ].map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                  {stat.label}
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#0f172a', lineHeight: 1 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight={600} color="#0f172a">
          Document Library
        </Typography>
      </Box>
      <Divider sx={{ mb: 4 }} />

      {/* Documents Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((k) => (
            <Grid item xs={12} sm={6} lg={4} key={k}>
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : documents.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: 2,
          }}
        >
          <FolderOpen sx={{ fontSize: 48, color: '#94a3b8' }} />
          <Typography variant="h6" color="#475569">
            No documents yet — upload your first one above
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} lg={4} key={doc.id}>
              <DocumentCard doc={doc} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
