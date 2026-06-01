import React from 'react';
import { DocumentMetadata } from '@compliance-analyzer/shared';
import { useNavigate } from 'react-router-dom';
import { FileText, File, Calendar, Trash2 } from 'lucide-react';

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
    <div 
      className="glass-card group cursor-pointer"
      onClick={() => navigate(`/document/${doc.id}`)}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isPdf ? 'bg-red-50 border-red-200 text-red-500' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            {isPdf ? <FileText className="h-6 w-6" /> : <File className="h-6 w-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="truncate text-base font-semibold text-surface-900 leading-tight mb-1" title={doc.originalName}>
              {doc.originalName}
            </h3>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${doc.complianceCategory === 'Standard' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                {doc.complianceCategory}
              </span>
            </div>
          </div>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc.id);
              }}
              className="p-1.5 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Summary */}
        {doc.summary && (
          <p className="mb-4 line-clamp-2 text-sm text-surface-600 leading-relaxed">
            {doc.summary}
          </p>
        )}

        {/* Topics */}
        {doc.topics && doc.topics.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {doc.topics.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md border border-surface-200 bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-surface-600"
              >
                {t}
              </span>
            ))}
            {doc.topics.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-surface-50 px-1.5 py-0.5 text-[10px] font-medium text-surface-400">
                +{doc.topics.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-[11px] text-surface-500 mt-auto pt-2 border-t border-surface-100">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(doc.uploadDate)}</span>
          <span className="ml-auto font-medium text-surface-400">
            {(doc.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
