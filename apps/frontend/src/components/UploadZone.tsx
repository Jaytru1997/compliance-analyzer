import React, { useCallback, useState } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
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
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-[220px]">
        <label htmlFor="category-select" className="mb-1.5 block text-sm font-medium text-surface-700">
          Document Category
        </label>
        <select
          id="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as 'Standard' | 'Procedure')}
          className="input-field"
        >
          <option value="Procedure">ACME Site Procedure</option>
          <option value="Standard">Recognised Standard</option>
        </select>
      </div>

      <div
        id="upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          dragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-surface-200 bg-surface-50/50 hover:border-primary-400 hover:bg-surface-50'
        }`}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={onFileChange}
        />
        
        <div className="mb-4 rounded-full bg-white p-4 shadow-sm ring-1 ring-surface-200 transition-transform group-hover:scale-105 group-hover:shadow-md">
          <UploadCloud className="h-8 w-8 text-primary-500" />
        </div>
        
        <h3 className="mb-1 text-lg font-semibold text-surface-900">
          Drop a document here
        </h3>
        
        <p className="mb-6 max-w-xs text-sm text-surface-500">
          Supports PDF and DOCX — mining procedures &amp; standards
        </p>
        
        <button className="btn-secondary">
          Browse Files
        </button>
        
        <div className="mt-6 flex justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-surface-600 shadow-sm ring-1 ring-surface-200">
            <File className="h-3.5 w-3.5" /> PDF
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-surface-600 shadow-sm ring-1 ring-surface-200">
            <File className="h-3.5 w-3.5" /> DOCX
          </span>
        </div>
      </div>

      {uploading && (
        <div className="animate-fade-in rounded-xl bg-white p-4 shadow-sm ring-1 ring-surface-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700">Uploading & analyzing with AI…</span>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600"></div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
            <div className="h-full w-full animate-[progress_1s_ease-in-out_infinite] bg-primary-500 rounded-full"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="animate-fade-in flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
