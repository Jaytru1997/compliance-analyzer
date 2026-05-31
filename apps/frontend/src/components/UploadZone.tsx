import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CloudUpload, InsertDriveFile } from '@mui/icons-material';
import { uploadDocument } from '../api/client';
import { DocumentMetadata } from '@compliance-analyzer/shared';

interface Props {
  onUploaded: (doc: DocumentMetadata) => void;
}

const UploadZone: React.FC<Props> = ({ onUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<'Standard' | 'Procedure'>('Procedure');

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const doc = await uploadDocument(file, category);
      onUploaded(doc);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Upload failed. Check backend is running.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [category]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" sx={{ maxWidth: 220 }}>
        <InputLabel id="category-label">Document Category</InputLabel>
        <Select
          labelId="category-label"
          id="upload-category"
          value={category}
          label="Document Category"
          onChange={(e) => setCategory(e.target.value as 'Standard' | 'Procedure')}
        >
          <MenuItem value="Procedure">ACME Site Procedure</MenuItem>
          <MenuItem value="Standard">Recognised Standard</MenuItem>
        </Select>
      </FormControl>

      <Box
        id="upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          border: `2px dashed ${dragging ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 3,
          p: 5,
          textAlign: 'center',
          background: dragging
            ? 'rgba(99,102,241,0.08)'
            : 'rgba(255,255,255,0.02)',
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'rgba(99,102,241,0.5)',
            background: 'rgba(99,102,241,0.05)',
          },
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx,.doc"
          hidden
          onChange={onFileChange}
        />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1, opacity: 0.8 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Drop a document here
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Supports PDF and DOCX — mining procedures &amp; standards
        </Typography>
        <Button variant="outlined" size="small" sx={{ mt: 1 }}>
          Browse Files
        </Button>
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Chip icon={<InsertDriveFile />} label="PDF" size="small" sx={{ opacity: 0.6 }} />
          <Chip icon={<InsertDriveFile />} label="DOCX" size="small" sx={{ opacity: 0.6 }} />
        </Box>
      </Box>

      {uploading && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            Uploading & analyzing with AI…
          </Typography>
          <LinearProgress sx={{ mt: 0.5, borderRadius: 2 }} />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};

export default UploadZone;
