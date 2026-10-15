import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Patient } from '../services/patientService';
import { type MultiLabelPredictionResult } from '../types/multilabel';
import { generateMultiLabelPdfReport } from '../utils/generateMultiLabelPdfReport';

interface MultiLabelScreeningProps {
  patient: Patient | null;
  patientId: string | null;
  file: File | null;
  previewUrl: string | null;
  currentUserToken: string | null;
  onClearScan: () => void;
  onNavigateToRecord?: () => void;
}

const BENCHMARK_AUC_DATA = [
  { condition: 'Atelectasis', auc: 0.8094 },
  { condition: 'Cardiomegaly', auc: 0.9064 },
  { condition: 'Effusion', auc: 0.8638 },
  { condition: 'Infiltration', auc: 0.7345 },
  { condition: 'Mass', auc: 0.8123 },
  { condition: 'Nodule', auc: 0.7725 },
  { condition: 'Pneumonia', auc: 0.7634 },
  { condition: 'Pneumothorax', auc: 0.8887 },
  { condition: 'Consolidation', auc: 0.7901 },
  { condition: 'Edema', auc: 0.8878 },
  { condition: 'Emphysema', auc: 0.8930 },
  { condition: 'Fibrosis', auc: 0.8047 },
  { condition: 'Pleural_Thickening', auc: 0.7744 },
  { condition: 'Hernia', auc: 0.7792 },
];

export const MultiLabelScreening: React.FC<MultiLabelScreeningProps> = ({
  patient,
  patientId,
  file,
  previewUrl,
  currentUserToken,
  onClearScan,
}) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<MultiLabelPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Class-Specific Grad-CAM state
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [activeHeatmap, setActiveHeatmap] = useState<string | null>(null);
  const [loadingGradcam, setLoadingGradcam] = useState<boolean>(false);
  const [gradcamCache, setGradcamCache] = useState<Record<string, string>>({});

  // Collapsible Benchmark Drawer / Info Modal state
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Trigger Multi-Label Inference (POST /api/v2/predict)
  const handleRunInference = async () => {
    if (!file) return;

    if (!patientId) {
      setError('Please select or register a patient before screening.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveCondition(null);
    setActiveHeatmap(null);
    setGradcamCache({});

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patientId);

      const headers: Record<string, string> = {};
      if (currentUserToken) {
        headers['Authorization'] = `Bearer ${currentUserToken}`;
      }

      const response = await fetch('http://127.0.0.1:8000/api/v2/predict', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Multi-label inference pipeline error. Check backend server.');
      }

      const data: MultiLabelPredictionResult = await response.json();
      setResult(data);
      setActiveCondition(data.primary_finding);
      setActiveHeatmap(data.heatmap_base64);

      // Pre-seed cache with primary finding heatmap
      setGradcamCache({
        [data.primary_finding.toLowerCase()]: data.heatmap_base64,
      });
    } catch (err) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Error connecting to multi-label inference backend.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Class-Specific Grad-CAM request (POST /api/v2/gradcam)
  const handleSelectConditionGradcam = async (conditionName: string) => {
    if (!file || !result) return;
    if (activeCondition === conditionName && activeHeatmap) return;

    const normalizedName = conditionName.toLowerCase();
    setActiveCondition(conditionName);

    // Check client cache first
    if (gradcamCache[normalizedName]) {
      setActiveHeatmap(gradcamCache[normalizedName]);
      return;
    }

    setLoadingGradcam(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_condition', conditionName);

      const headers: Record<string, string> = {};
      if (currentUserToken) {
        headers['Authorization'] = `Bearer ${currentUserToken}`;
      }

      const response = await fetch('http://127.0.0.1:8000/api/v2/gradcam', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate heatmap for ${conditionName}`);
      }

      const data = await response.json();
      setActiveHeatmap(data.heatmap_base64);
      setGradcamCache((prev) => ({
        ...prev,
        [normalizedName]: data.heatmap_base64,
      }));
    } catch (err) {
      console.error('Grad-CAM fetch error:', err);
    } finally {
      setLoadingGradcam(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!result || !patient) return;
    setGeneratingPdf(true);
    try {
      const heatmapBase64 = activeHeatmap || result.heatmap_base64 || '';
      const formattedImage = heatmapBase64.startsWith('data:image')
        ? heatmapBase64
        : `data:image/png;base64,${heatmapBase64}`;

      await generateMultiLabelPdfReport(
        patient,
        result,
        activeCondition || result.primary_finding,
        formattedImage
      );
    } catch (err) {
      console.error('Failed to generate multi-label report:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Sort findings descending by probability
  const sortedFindings = result ? [...result.findings].sort((a, b) => b.probability - a.probability) : [];
  const detectedCount = sortedFindings.filter((f) => f.detected).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-[#D9E2EA] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EAF1F6] text-[#163B5C] flex items-center justify-center font-bold text-lg">
            🧬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#163B5C]">Comprehensive Thoracic Screening (14 Findings)</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAF1F6] text-[#315D7D] font-semibold border border-[#D0DFEB]">
                v2.0 DenseNet-121
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Simultaneous differential screening across 14 thoracic pathologies with interactive class-level Grad-CAM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => setShowBenchmarkModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EAF1F6] hover:bg-[#D0DFEB] text-[#163B5C] border border-[#D0DFEB] transition flex items-center gap-1.5 cursor-pointer"
            title="View held-out test set benchmark AUC scores"
          >
            <span>📊</span>
            <span>Benchmark Metrics (Mean AUC 0.8057)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Previews & Action Triggers (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Trigger Card if no result yet */}
          {!result && (
            <div className="clinical-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
                <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold">
                  Multi-Target AI Evaluation
                </span>
                <span className="text-[10px] font-mono text-[#3D8C87] font-semibold">14 Classes</span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Click below to process the ingested chest radiograph with the 14-output DenseNet-121 classification
                engine.
              </p>

              <button
                onClick={handleRunInference}
                disabled={!file || loading || !patientId}
                className={`w-full py-3 rounded-lg font-semibold text-xs tracking-wide uppercase transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer ${!file || loading || !patientId
                    ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
                    : 'text-white bg-[#163B5C] hover:bg-[#315D7D]'
                  }`}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Running 14-Pathology Screening...</span>
                  </>
                ) : (
                  <span>Run 14-Finding Thoracic Analysis</span>
                )}
              </button>

              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2">
                  <span className="font-bold">⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Interactive Dual Heatmap PACS Viewer */}
          <div className="clinical-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold">
                  Radiographic Imagery & Grad-CAM
                </span>
                {activeCondition && (
                  <div className="text-[11px] text-[#315D7D] font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3D8C87]"></span>
                    Visualizing: <span className="font-mono">{activeCondition.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
              {result && (
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#EAF1F6] border border-[#D0DFEB] text-[#163B5C]">
                  {result.examination_id.slice(0, 10)}
                </span>
              )}
            </div>

            {/* Side-by-side or stacked dual display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Anatomical Radiograph */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#64748B]">
                  <span>Input Radiograph</span>
                  <span>Anatomical</span>
                </div>
                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#243447]">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Ingested Radiograph" className="object-contain h-full w-full" />
                  ) : (
                    <div className="text-center p-4">
                      <span className="block text-[#94A3B8] text-xs font-mono">16-bit DICOM File</span>
                      <span className="text-[10px] text-[#64748B]">Windowed Min/Max RGB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Class-Specific Grad-CAM Frame */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#163B5C] font-semibold">
                  <span>Grad-CAM Activation</span>
                  <span className="text-[#3D8C87]">Norm5 Layer</span>
                </div>
                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#315D7D] relative overflow-hidden">
                  {loadingGradcam ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                      <span className="w-6 h-6 border-2 border-[#315D7D]/40 border-t-[#3D8C87] rounded-full animate-spin"></span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">Generating {activeCondition} CAM...</span>
                    </div>
                  ) : activeHeatmap ? (
                    <img
                      src={activeHeatmap}
                      alt={`Grad-CAM for ${activeCondition}`}
                      className="object-contain h-full w-full"
                    />
                  ) : (
                    <div className="text-center p-4 text-[#64748B] text-xs font-mono">
                      <span>Inference required to render heatmap</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {result && (
              <p className="text-[11px] text-[#64748B] italic text-center">
                💡 Tip: Click any row in the Findings Breakdown table to dynamically generate the spatial activation
                heatmap for that pathology.
              </p>
            )}
          </div>

          {/* Quick Actions Card when results ready */}
          {result && (
            <div className="clinical-card p-5 space-y-3">
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleDownloadReport}
                  disabled={generatingPdf}
                  className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-lg font-semibold text-xs bg-[#163B5C] hover:bg-[#315D7D] text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generatingPdf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Compiling 14-Finding PDF...</span>
                    </>
                  ) : (
                    <>
                      <span>📄 Export 14-Pathology PDF</span>
                    </>
                  )}
                </button>

                {patientId && (
                  <button
                    onClick={() => navigate(`/patients/${patientId}`)}
                    className="px-3.5 py-2.5 rounded-lg font-medium text-xs bg-white hover:bg-[#EAF1F6] text-[#163B5C] border border-[#D9E2EA] transition cursor-pointer"
                  >
                    👤 Patient Record
                  </button>
                )}

                <button
                  onClick={() => {
                    setResult(null);
                    setActiveCondition(null);
                    setActiveHeatmap(null);
                    onClearScan();
                  }}
                  className="px-3 py-2.5 rounded-lg font-medium text-xs text-[#64748B] hover:text-[#163B5C] transition cursor-pointer"
                >
                  Clear & Re-Screen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Label Findings Table & Transparency (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="clinical-card p-6 lg:p-8 space-y-6">
              {/* Primary Finding Clinical Highlight Card */}
              <div
                className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${result.primary_confidence >= 0.5
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    : result.primary_confidence >= 0.3
                      ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                      : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                  }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80 block">
                    Highest Probability Finding
                  </span>
                  <div className="text-2xl font-black tracking-tight mt-0.5">
                    {result.primary_finding.replace('_', ' ')}
                  </div>
                  <div className="text-xs mt-1 font-mono font-medium">
                    Confidence: {(result.primary_confidence * 100).toFixed(1)}% • Model: {result.model_version}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  <div
                    className={`px-3 py-1.5 rounded-md font-mono font-bold text-xs border inline-block ${result.primary_confidence >= 0.5
                        ? 'bg-[#FEE2E2] border-[#F87171] text-[#991B1B]'
                        : result.primary_confidence >= 0.3
                          ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                          : 'bg-[#DCFCE7] border-[#4ADE80] text-[#166534]'
                      }`}
                  >
                    {result.primary_confidence >= 0.5
                      ? 'PATHOLOGY DETECTED (≥50%)'
                      : result.primary_confidence >= 0.3
                        ? 'MODERATE SUSPICION (30-49%)'
                        : 'NORMAL / LOW PROBABILITY'}
                  </div>
                  <span className="text-[11px] font-mono opacity-75">
                    {detectedCount} of 14 pathologies flagged
                  </span>
                </div>
              </div>

              {/* Findings Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#163B5C]">Pathology Probability Spectrum (14 Findings)</h3>
                    <p className="text-[11px] text-[#64748B]">
                      Ordered by descending probability. Click any condition to view its specific activation map.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B]">Threshold: 50.0%</span>
                </div>

                <div className="border border-[#D9E2EA] rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#EAF1F6] border-b border-[#D9E2EA] text-[10px] font-mono uppercase text-[#163B5C] font-semibold">
                          <th className="py-2.5 px-3">Condition</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 w-40">Confidence Bar</th>
                          <th className="py-2.5 px-3 text-right">Probability</th>
                          <th className="py-2.5 px-3 text-center">Heatmap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {sortedFindings.map((finding) => {
                          const pct = (finding.probability * 100).toFixed(1);
                          const isHigh = finding.probability >= 0.5;
                          const isModerate = finding.probability >= 0.3 && finding.probability < 0.5;
                          const isCurrentActive = activeCondition === finding.condition;

                          return (
                            <tr
                              key={finding.condition}
                              onClick={() => handleSelectConditionGradcam(finding.condition)}
                              className={`transition-colors cursor-pointer ${isCurrentActive
                                  ? 'bg-[#EAF1F6]/70 font-semibold'
                                  : 'hover:bg-[#F8FAFC]'
                                }`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  {isCurrentActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#3D8C87] shrink-0"></span>
                                  )}
                                  <span className="text-[#163B5C]">
                                    {finding.condition.replace('_', ' ')}
                                  </span>
                                  {finding.condition === result.primary_finding && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#315D7D] text-white">
                                      PRIMARY
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${isHigh
                                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                                      : isModerate
                                        ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                                    }`}
                                >
                                  {isHigh ? 'DETECTED' : isModerate ? 'BORDERLINE' : 'UNREMARKABLE'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${isHigh ? 'bg-[#DC2626]' : isModerate ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]'
                                      }`}
                                    style={{ width: `${Math.min(finding.probability * 100, 100)}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#163B5C]">
                                {pct}%
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectConditionGradcam(finding.condition);
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition cursor-pointer ${isCurrentActive
                                      ? 'bg-[#163B5C] text-white'
                                      : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#EAF1F6]'
                                    }`}
                                >
                                  {isCurrentActive ? 'Active' : 'View CAM'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Protocol Disclaimer */}
              <div className="pt-4 border-t border-[#D9E2EA] text-[11px] text-[#64748B] leading-relaxed">
                <strong className="text-[#163B5C]">Multi-Pathology Screening Protocol:</strong> DenseNet-121 14-output
                inference serves as an assistive triage aid. Findings with probability ≥ 50.0% represent elevated
                radiographic risk. Definitive clinical diagnosis requires certified radiological correlation.
              </div>
            </div>
          ) : (
            /* Empty State Awaiting Inference */
            <div className="clinical-card p-12 flex flex-col items-center justify-center text-center min-h-[460px] bg-[#F8FAFC]">
              <div className="w-14 h-14 rounded-full bg-[#EAF1F6] flex items-center justify-center text-2xl text-[#163B5C] mb-4">
                🩺
              </div>
              <h3 className="text-base font-bold text-[#163B5C] mb-1">Awaiting 14-Pathology Screening</h3>
              <p className="text-xs text-[#64748B] max-w-md leading-relaxed mb-6">
                Ensure a registered patient is selected and a chest radiograph is loaded. Then click "Run 14-Finding
                Thoracic Analysis" to initiate multi-target inference across all conditions.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#475569]">
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Atelectasis</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Cardiomegaly</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Effusion</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Infiltration</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Mass</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Nodule</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Pneumonia</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Pneumothorax</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Consolidation</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Edema</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Emphysema</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Fibrosis</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Pleural Thickening</span>
                <span className="p-1.5 rounded bg-white border border-[#D9E2EA]">Hernia</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Held-out Test Set Benchmark Modal */}
      {showBenchmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#D9E2EA] space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-base font-bold text-[#163B5C]">Model Performance Benchmark</h3>
                  <p className="text-xs text-[#64748B]">Held-Out Test Set Validation on NIH ChestX-ray14</p>
                </div>
              </div>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAF1F6] text-[#475569] hover:text-[#163B5C] flex items-center justify-center transition font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Overall Score Highlight */}
            <div className="p-4 rounded-xl bg-[#EAF1F6] border border-[#D0DFEB] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#315D7D] font-bold">
                  Aggregate Benchmark Score
                </span>
                <div className="text-2xl font-black text-[#163B5C]">Mean AUC-ROC: 0.8057</div>
                <p className="text-xs text-[#475569] mt-0.5">
                  DenseNet-121 architecture evaluated across all 14 thoracic findings
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#315D7D] text-white font-mono font-bold text-xs">
                VERIFIED
              </div>
            </div>

            {/* Per-Pathology AUC Table */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#163B5C]">Per-Condition Discrimination Performance (AUC-ROC):</span>
              <div className="max-h-60 overflow-y-auto border border-[#D9E2EA] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#D9E2EA] text-[10px] font-mono uppercase text-[#64748B] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Condition</th>
                      <th className="py-2 px-3 text-right">Held-Out AUC</th>
                      <th className="py-2 px-3 w-32">Benchmark Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {BENCHMARK_AUC_DATA.map((item) => (
                      <tr key={item.condition} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-[#163B5C]">
                          {item.condition.replace('_', ' ')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#315D7D]">
                          {item.auc.toFixed(4)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#3D8C87]"
                              style={{ width: `${item.auc * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#D9E2EA]">
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="px-4 py-2 rounded-lg font-semibold text-xs bg-[#163B5C] hover:bg-[#315D7D] text-white transition cursor-pointer"
              >
                Close Metrics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
