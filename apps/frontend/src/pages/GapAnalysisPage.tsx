import React, { useEffect, useState } from 'react';
import { 
  ArrowRightLeft, 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown 
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { fetchDocuments, runGapAnalysis } from '../api/client';
import { DocumentMetadata, GapAnalysisFinding } from '@compliance-analyzer/shared';

const GapAnalysisPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [standardId, setStandardId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<GapAnalysisFinding[] | null>(null);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    fetchDocuments()
      .then((docs) => setDocuments(Array.isArray(docs) ? docs : []))
      .catch(() => {});
  }, []);

  const standards = documents.filter((d) => d.complianceCategory === 'Standard');
  const procedures = documents.filter((d) => d.complianceCategory === 'Procedure');

  const handleRun = async () => {
    setError('');
    setFindings(null);
    setRunning(true);
    setExpandedRow(null);
    try {
      const res = await runGapAnalysis(standardId, procedureId);
      setFindings(res.findings);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gap analysis failed. Ensure both documents are uploaded.');
    } finally {
      setRunning(false);
    }
  };

  const fullGaps = findings?.filter((f) => f.type === 'Full Gap').length ?? 0;
  const partialGaps = findings?.filter((f) => f.type === 'Partial Gap').length ?? 0;
  const compliant = findings?.filter((f) => f.type === 'Full Compliance').length ?? 0;
  const highRisk = findings?.filter((f) => f.severity === 'High').length ?? 0;

  return (
    <AppLayout>
      <div className="mb-10 pt-4">
        <div className="mb-2 flex items-center gap-3">
          <ArrowRightLeft className="h-8 w-8 text-surface-900" />
          <h1 className="heading-1">Gap Analysis</h1>
        </div>
        <p className="max-w-2xl text-lg text-surface-500 leading-relaxed">
          Compare an ACME Site Procedure against a Recognised Standard to identify compliance gaps,
          partial gaps, and areas of full compliance.
        </p>
      </div>

      <div className="glass-card mb-10 overflow-hidden">
        <div className="border-b border-surface-200 bg-surface-50 p-6 sm:p-8">
          <h2 className="heading-3 mb-6">Select Documents to Compare</h2>
          
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="select-standard" className="mb-1.5 block text-sm font-medium text-surface-700">
                Recognised Standard
              </label>
              <select
                id="select-standard"
                value={standardId}
                onChange={(e) => setStandardId(e.target.value)}
                className="input-field"
              >
                <option value="" disabled>Select a standard...</option>
                {standards.length === 0 && <option disabled>No standards uploaded yet</option>}
                {standards.map((d) => (
                  <option key={d.id} value={d.id}>{d.originalName}</option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center justify-center sm:pb-2">
              <div className="rounded-full bg-surface-200 p-2">
                <ArrowRightLeft className="h-5 w-5 text-surface-500" />
              </div>
            </div>

            <div className="flex-1">
              <label htmlFor="select-procedure" className="mb-1.5 block text-sm font-medium text-surface-700">
                ACME Site Procedure
              </label>
              <select
                id="select-procedure"
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                className="input-field"
              >
                <option value="" disabled>Select a procedure...</option>
                {procedures.length === 0 && <option disabled>No procedures uploaded yet</option>}
                {procedures.map((d) => (
                  <option key={d.id} value={d.id}>{d.originalName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8">
            <button
              id="btn-run-gap-analysis"
              onClick={handleRun}
              disabled={!standardId || !procedureId || running}
              className="btn-primary h-12 w-full sm:w-auto px-8"
            >
              {running ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  Running Analysis…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Run Gap Analysis
                </span>
              )}
            </button>
          </div>

          {running && (
            <div className="mt-6">
              <p className="mb-2 text-sm text-surface-500">Agent is comparing documents… this may take 30–60 seconds.</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
                <div className="h-full w-full animate-[progress_1s_ease-in-out_infinite] bg-primary-600 rounded-full"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {findings && (
        <div className="animate-fade-in">
          <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Full Gaps', value: fullGaps, colorClass: 'text-red-600', bgClass: 'bg-red-50 border-red-200' },
              { label: 'Partial Gaps', value: partialGaps, colorClass: 'text-amber-600', bgClass: 'bg-amber-50 border-amber-200' },
              { label: 'Full Compliance', value: compliant, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50 border-emerald-200' },
              { label: 'High Risk Items', value: highRisk, colorClass: 'text-red-600', bgClass: 'bg-red-50 border-red-200' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl border p-6 ${stat.bgClass}`}>
                <p className={`text-4xl font-bold tracking-tight mb-2 ${stat.colorClass}`}>{stat.value}</p>
                <h3 className="text-xs font-bold tracking-wider text-surface-600 uppercase">{stat.label}</h3>
              </div>
            ))}
          </div>

          <h2 className="heading-2 mb-4">Detailed Findings ({findings.length})</h2>
          <hr className="mb-6 border-surface-200" />

          <div className="space-y-4">
            {findings.map((finding, idx) => {
              const isExpanded = expandedRow === idx;
              
              let TypeIcon = CheckCircle2;
              let typeColors = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
              let borderColors = 'border-surface-200 hover:border-emerald-300';
              
              if (finding.type === 'Partial Gap') {
                TypeIcon = AlertTriangle;
                typeColors = 'bg-amber-50 text-amber-700 ring-amber-200';
                borderColors = 'border-surface-200 hover:border-amber-300';
              } else if (finding.type === 'Full Gap') {
                TypeIcon = XCircle;
                typeColors = 'bg-red-50 text-red-700 ring-red-200';
                borderColors = 'border-surface-200 hover:border-red-300';
              }

              let severityColors = 'text-emerald-700 ring-emerald-200';
              if (finding.severity === 'Medium') severityColors = 'text-amber-700 ring-amber-200';
              if (finding.severity === 'High') severityColors = 'text-red-700 ring-red-200';

              if (isExpanded) {
                 if (finding.type === 'Partial Gap') borderColors = 'border-amber-300 ring-1 ring-amber-300';
                 else if (finding.type === 'Full Gap') borderColors = 'border-red-300 ring-1 ring-red-300';
                 else borderColors = 'border-emerald-300 ring-1 ring-emerald-300';
              }

              return (
                <div 
                  key={idx} 
                  className={`rounded-xl border bg-white transition-all duration-200 overflow-hidden ${borderColors}`}
                >
                  <button
                    className="flex w-full items-center gap-4 p-4 text-left sm:p-5"
                    onClick={() => setExpandedRow(isExpanded ? null : idx)}
                  >
                    <TypeIcon className={`h-6 w-6 shrink-0 ${finding.type === 'Full Gap' ? 'text-red-500' : finding.type === 'Partial Gap' ? 'text-amber-500' : 'text-emerald-500'}`} />
                    
                    <div className="flex-1">
                      <p className="font-semibold text-surface-900 pr-4">{finding.requirement}</p>
                    </div>

                    <div className="hidden sm:flex shrink-0 items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${typeColors}`}>
                        {finding.type}
                      </span>
                      <span className={`inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-inset ${severityColors}`}>
                        {finding.severity} Risk
                      </span>
                    </div>

                    <ChevronDown className={`h-5 w-5 shrink-0 text-surface-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Mobile badges */}
                  <div className="flex sm:hidden px-4 pb-4 gap-2 pl-[3.25rem]">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${typeColors}`}>
                        {finding.type}
                      </span>
                      <span className={`inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium ring-1 ring-inset ${severityColors}`}>
                        {finding.severity} Risk
                      </span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-100 bg-surface-50/50 p-4 sm:p-6">
                      <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
                        <table className="min-w-full divide-y divide-surface-200 text-sm">
                          <tbody className="divide-y divide-surface-100">
                            <tr>
                              <td className="w-1/3 bg-surface-50 py-3 pl-4 pr-3 font-semibold text-surface-700 sm:w-1/4">Standard Citation</td>
                              <td className="py-3 px-4 italic text-surface-600">{finding.standardCitation}</td>
                            </tr>
                            <tr>
                              <td className="bg-surface-50 py-3 pl-4 pr-3 font-semibold text-surface-700">Procedure Citation</td>
                              <td className={`py-3 px-4 italic ${finding.procedureCitation === 'Not found' ? 'text-red-600 font-medium' : 'text-surface-900'}`}>
                                {finding.procedureCitation}
                              </td>
                            </tr>
                            <tr>
                              <td className="bg-surface-50 py-3 pl-4 pr-3 font-semibold text-surface-700 align-top">Recommendation</td>
                              <td className="py-3 px-4 text-surface-900 font-medium">{finding.recommendation}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default GapAnalysisPage;
