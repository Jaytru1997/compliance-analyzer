import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, BarChart2, FolderOpen, AlertCircle } from 'lucide-react';
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

  const procedures = Array.isArray(documents) ? documents.filter((d) => d.complianceCategory === 'Procedure') : [];
  const standards = Array.isArray(documents) ? documents.filter((d) => d.complianceCategory === 'Standard') : [];

  return (
    <AppLayout>
      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="flex-1">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-10 pt-4">
        <h1 className="heading-1 mb-3">Compliance Dashboard</h1>
        <p className="mb-8 max-w-2xl text-lg text-surface-500 leading-relaxed">
          Upload mining safety procedures and recognised standards to analyze gaps and run interactive compliance Q&amp;A.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            id="btn-upload-document"
            onClick={() => setShowUpload((s) => !s)}
            className="btn-primary h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </button>
          <button
            id="btn-go-gap-analysis"
            onClick={() => navigate('/gap-analysis')}
            className="btn-secondary h-11"
          >
            <BarChart2 className="h-4 w-4 mr-2 text-surface-500" />
            Run Gap Analysis
          </button>
        </div>
      </div>

      {/* Upload Zone Collapse */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showUpload ? 'max-h-[800px] mb-10 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50/50 p-6 sm:p-8">
          <h2 className="heading-3 mb-6">Upload Compliance Document</h2>
          <UploadZone onUploaded={handleUploaded} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        {[
          { label: 'Total Documents', value: documents.length },
          { label: 'ACME Procedures', value: procedures.length },
          { label: 'Recognised Standards', value: standards.length },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <h3 className="mb-2 text-xs font-bold tracking-wider text-surface-500 uppercase">
              {stat.label}
            </h3>
            <p className="text-4xl font-bold tracking-tight text-surface-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="heading-2">Document Library</h2>
      </div>
      <hr className="mb-8 border-surface-200" />

      {/* Documents Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-[220px] animate-pulse rounded-xl bg-surface-200"></div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 bg-white py-16 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-surface-100 p-4">
            <FolderOpen className="h-10 w-10 text-surface-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-600">
            No documents yet — upload your first one above
          </h3>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
