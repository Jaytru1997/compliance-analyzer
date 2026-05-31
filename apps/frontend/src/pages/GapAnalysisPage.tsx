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
  return '#22c55e';
};

const typeIcon = (type: string) => {
  if (type === 'Full Compliance') return <CheckCircle sx={{ fontSize: 18, color: '#22c55e' }} />;
  if (type === 'Partial Gap') return <Warning sx={{ fontSize: 18, color: '#f59e0b' }} />;
  return <ErrorIcon sx={{ fontSize: 18, color: '#ef4444' }} />;
};

const GapAnalysisPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [standardId, setStandardId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<GapAnalysisFinding[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments().then(setDocuments).catch(() => {});
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
      <Box
        sx={{
          mb: 5,
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(99,102,241,0.08) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CompareArrows sx={{ fontSize: 32, color: 'secondary.main' }} />
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
            Gap Analysis
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Compare an ACME Site Procedure against a Recognised Standard to identify compliance gaps,
          partial gaps, and areas of full compliance.
        </Typography>
      </Box>

      {/* Configuration Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Select Documents to Compare
          </Typography>
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth>
                <InputLabel id="standard-select-label">Recognised Standard</InputLabel>
                <Select
                  labelId="standard-select-label"
                  id="select-standard"
                  value={standardId}
                  label="Recognised Standard"
                  onChange={(e) => setStandardId(e.target.value)}
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

            <Grid item xs={12} sm={2} sx={{ textAlign: 'center' }}>
              <CompareArrows sx={{ fontSize: 28, color: 'text.secondary' }} />
            </Grid>

            <Grid item xs={12} sm={5}>
              <FormControl fullWidth>
                <InputLabel id="procedure-select-label">ACME Site Procedure</InputLabel>
                <Select
                  labelId="procedure-select-label"
                  id="select-procedure"
                  value={procedureId}
                  label="ACME Site Procedure"
                  onChange={(e) => setProcedureId(e.target.value)}
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
              >
                {running ? 'Running Analysis…' : 'Run Gap Analysis'}
              </Button>
            </Grid>
          </Grid>

          {running && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Claude is comparing documents… this may take 30–60 seconds.
              </Typography>
              <LinearProgress sx={{ mt: 0.5, borderRadius: 2 }} />
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>

      {/* Results */}
      {findings && (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Full Gaps', value: fullGaps, color: '#ef4444', icon: <ErrorIcon /> },
              { label: 'Partial Gaps', value: partialGaps, color: '#f59e0b', icon: <Warning /> },
              { label: 'Full Compliance', value: compliant, color: '#22c55e', icon: <CheckCircle /> },
              { label: 'High Risk Items', value: highRisk, color: '#ef4444', icon: <ErrorIcon /> },
            ].map((stat) => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Card
                  sx={{
                    border: `1px solid ${stat.color}22`,
                    background: `linear-gradient(135deg, ${stat.color}12 0%, transparent 100%)`,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h3" fontWeight={700} sx={{ color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Detailed Findings */}
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Detailed Findings ({findings.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {findings.map((finding, idx) => (
              <Accordion
                key={idx}
                id={`finding-${idx}`}
                sx={{
                  background: 'rgba(17,24,39,0.8)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderRadius: '12px !important',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    borderColor:
                      finding.type === 'Full Gap'
                        ? 'rgba(239,68,68,0.3)'
                        : finding.type === 'Partial Gap'
                        ? 'rgba(245,158,11,0.3)'
                        : 'rgba(34,197,94,0.3)',
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 3, py: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap', mr: 2 }}>
                    {typeIcon(finding.type)}
                    <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                      {finding.requirement}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={finding.type}
                        size="small"
                        sx={{
                          background:
                            finding.type === 'Full Gap'
                              ? 'rgba(239,68,68,0.15)'
                              : finding.type === 'Partial Gap'
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(34,197,94,0.15)',
                          color:
                            finding.type === 'Full Gap'
                              ? '#ef4444'
                              : finding.type === 'Partial Gap'
                              ? '#f59e0b'
                              : '#22c55e',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}
                      />
                      <Chip
                        label={finding.severity}
                        size="small"
                        sx={{
                          background: `${severityColor(finding.severity)}20`,
                          color: severityColor(finding.severity),
                          border: `1px solid ${severityColor(finding.severity)}40`,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}
                      />
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: 'text.secondary', width: 180, border: 'none' }}>
                            Standard Citation
                          </TableCell>
                          <TableCell sx={{ border: 'none' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#818cf8' }}>
                              {finding.standardCitation}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: 'text.secondary', border: 'none' }}>
                            Procedure Citation
                          </TableCell>
                          <TableCell sx={{ border: 'none' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontStyle: 'italic',
                                color: finding.procedureCitation === 'Not found' ? '#ef4444' : '#34d399',
                              }}
                            >
                              {finding.procedureCitation}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, color: 'text.secondary', border: 'none', verticalAlign: 'top' }}>
                            Recommendation
                          </TableCell>
                          <TableCell sx={{ border: 'none' }}>
                            <Typography variant="body2">{finding.recommendation}</Typography>
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
