import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  Analytics,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  CompareArrows,
} from '@mui/icons-material';
import AppLayout from '../components/AppLayout';
import { fetchDocuments, runGapAnalysis } from '../api/client';
import { DocumentMetadata, GapAnalysisFinding } from '@compliance-analyzer/shared';

const severityColor = (s: string) => {
  if (s === 'High') return '#ef4444';
  if (s === 'Medium') return '#f59e0b';
  return '#10b981';
};

const typeIcon = (type: string) => {
  if (type === 'Full Compliance') return <CheckCircle sx={{ fontSize: 20, color: '#10b981' }} />;
  if (type === 'Partial Gap') return <Warning sx={{ fontSize: 20, color: '#f59e0b' }} />;
  return <ErrorIcon sx={{ fontSize: 20, color: '#ef4444' }} />;
};

const GapAnalysisPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [standardId, setStandardId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<GapAnalysisFinding[] | null>(null);
  const [error, setError] = useState('');

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
    try {
      const res = await runGapAnalysis(standardId, procedureId);
      setFindings(res.findings);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Gap analysis failed. Ensure both documents are uploaded.');
    } finally {
      setRunning(false);
    }
  };

  // Summary counts
  const fullGaps = findings?.filter((f) => f.type === 'Full Gap').length ?? 0;
  const partialGaps = findings?.filter((f) => f.type === 'Partial Gap').length ?? 0;
  const compliant = findings?.filter((f) => f.type === 'Full Compliance').length ?? 0;
  const highRisk = findings?.filter((f) => f.severity === 'High').length ?? 0;

  return (
    <AppLayout>
      {/* Header */}
      <Box sx={{ mb: 5, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CompareArrows sx={{ fontSize: 32, color: '#0f172a' }} />
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em', color: '#0f172a' }}>
            Gap Analysis
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: '#475569', fontSize: '1.1rem', maxWidth: 720 }}>
          Compare an ACME Site Procedure against a Recognised Standard to identify compliance gaps,
          partial gaps, and areas of full compliance.
        </Typography>
      </Box>

      {/* Configuration Card */}
      <Card sx={{ mb: 5, boxShadow: 'none' }}>
        <CardContent sx={{ p: 4, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom color="#0f172a">
            Select Documents to Compare
          </Typography>
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel id="standard-select-label">Recognised Standard</InputLabel>
                <Select
                  labelId="standard-select-label"
                  id="select-standard"
                  value={standardId}
                  label="Recognised Standard"
                  onChange={(e) => setStandardId(e.target.value)}
                  sx={{ backgroundColor: '#ffffff' }}
                >
                  {standards.length === 0 && (
                    <MenuItem value="" disabled>
                      No standards uploaded yet
                    </MenuItem>
                  )}
                  {standards.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.originalName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2} sx={{ textAlign: 'center', pb: 1 }}>
              <CompareArrows sx={{ fontSize: 24, color: '#94a3b8' }} />
            </Grid>

            <Grid item xs={12} sm={5}>
              <FormControl fullWidth size="small">
                <InputLabel id="procedure-select-label">ACME Site Procedure</InputLabel>
                <Select
                  labelId="procedure-select-label"
                  id="select-procedure"
                  value={procedureId}
                  label="ACME Site Procedure"
                  onChange={(e) => setProcedureId(e.target.value)}
                  sx={{ backgroundColor: '#ffffff' }}
                >
                  {procedures.length === 0 && (
                    <MenuItem value="" disabled>
                      No procedures uploaded yet
                    </MenuItem>
                  )}
                  {procedures.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.originalName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                id="btn-run-gap-analysis"
                variant="contained"
                startIcon={<Analytics />}
                onClick={handleRun}
                disabled={!standardId || !procedureId || running}
                size="large"
                sx={{ mt: 2 }}
              >
                {running ? 'Running Analysis…' : 'Run Gap Analysis'}
              </Button>
            </Grid>
          </Grid>

          {running && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="#64748b">
                Agent is comparing documents… this may take 30–60 seconds.
              </Typography>
              <LinearProgress sx={{ mt: 1, borderRadius: 2, height: 6, backgroundColor: '#e2e8f0', '& .MuiLinearProgress-bar': { backgroundColor: '#2563eb' } }} />
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
        </CardContent>
      </Card>

      {/* Results */}
      {findings && (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            {[
              { label: 'Full Gaps', value: fullGaps, color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' },
              { label: 'Partial Gaps', value: partialGaps, color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fde68a' },
              { label: 'Full Compliance', value: compliant, color: '#10b981', bgColor: '#ecfdf5', borderColor: '#a7f3d0' },
              { label: 'High Risk Items', value: highRisk, color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' },
            ].map((stat) => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Card sx={{ border: `1px solid ${stat.borderColor}`, backgroundColor: stat.bgColor, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h3" fontWeight={700} sx={{ color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h5" fontWeight={600} gutterBottom color="#0f172a">
            Detailed Findings ({findings.length})
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {findings.map((finding, idx) => (
              <Accordion
                key={idx}
                id={`finding-${idx}`}
                disableGutters
                sx={{
                  backgroundColor: '#ffffff',
                  border: `1px solid #e2e8f0`,
                  borderRadius: '8px !important',
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    borderColor:
                      finding.type === 'Full Gap'
                        ? '#fecaca'
                        : finding.type === 'Partial Gap'
                        ? '#fde68a'
                        : '#a7f3d0',
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 3, py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap', mr: 2 }}>
                    {typeIcon(finding.type)}
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, color: '#1e293b' }}>
                      {finding.requirement}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={finding.type}
                        size="small"
                        sx={{
                          backgroundColor:
                            finding.type === 'Full Gap'
                              ? '#fef2f2'
                              : finding.type === 'Partial Gap'
                              ? '#fffbeb'
                              : '#ecfdf5',
                          color:
                            finding.type === 'Full Gap'
                              ? '#ef4444'
                              : finding.type === 'Partial Gap'
                              ? '#f59e0b'
                              : '#10b981',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          border: `1px solid ${
                            finding.type === 'Full Gap'
                              ? '#fecaca'
                              : finding.type === 'Partial Gap'
                              ? '#fde68a'
                              : '#a7f3d0'
                          }`,
                        }}
                      />
                      <Chip
                        label={finding.severity}
                        size="small"
                        sx={{
                          backgroundColor: '#ffffff',
                          color: severityColor(finding.severity),
                          border: `1px solid ${severityColor(finding.severity)}`,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 3, pb: 4, pt: 0 }}>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#64748b', width: 200, borderBottom: '1px solid #f1f5f9' }}>
                            Standard Citation
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#334155' }}>
                              {finding.standardCitation}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                            Procedure Citation
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid #f1f5f9' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontStyle: 'italic',
                                color: finding.procedureCitation === 'Not found' ? '#ef4444' : '#0f172a',
                              }}
                            >
                              {finding.procedureCitation}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: '#64748b', border: 'none', verticalAlign: 'top' }}>
                            Recommendation
                          </TableCell>
                          <TableCell sx={{ border: 'none' }}>
                            <Typography variant="body2" sx={{ color: '#0f172a' }}>{finding.recommendation}</Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </>
      )}
    </AppLayout>
  );
};

export default GapAnalysisPage;
