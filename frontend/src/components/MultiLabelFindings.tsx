import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Patient } from '../services/patientService';
import { type MultiLabelPredictionResult } from '../types/multilabel';
import { generateMultiLabelPdfReport } from '../utils/generateMultiLabelPdfReport';

interface MultiLabelFindingsProps {
  patient: Patient | null;
  patientId: string | null;
  file: File | null;
  previewUrl: string | null;
  result: MultiLabelPredictionResult | null;
  loading: boolean;
  error: string | null;
  currentUserToken: string | null;
  onClear: () => void;
  onRunInference: () => void;
}

const BENCHMARK_AUC_SCORES = [
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

export const MultiLabelFindings: React.FC<MultiLabelFindingsProps> = ({
  patient,
  patientId,
  file,
  previewUrl,
  result,
  loading,
  error,
  currentUserToken,
  onClear,
  onRunInference,
}) => {
  const navigate = useNavigate();

  // Active condition and heatmap state
  const [activeCondition, setActiveCondition] = useState<string | null>(null);
  const [activeHeatmap, setActiveHeatmap] = useState<string | null>(null);
  const [loadingGradcam, setLoadingGradcam] = useState<boolean>(false);
  const [gradcamCache, setGradcamCache] = useState<Record<string, string>>({});

  // Transparency modal state
  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Synchronize when a new prediction result arrives
  useEffect(() => {
    if (result) {
      setActiveCondition(result.primary_finding);
      setActiveHeatmap(result.heatmap_base64);
      setGradcamCache({
        [result.primary_finding.toLowerCase()]: result.heatmap_base64,
      });
    } else {
      setActiveCondition(null);
      setActiveHeatmap(null);
      setGradcamCache({});
    }
  }, [result]);

  // Dynamic class-specific Grad-CAM switching
  const handleSelectConditionGradcam = async (conditionName: string) => {
    if (!file || !result) return;
    if (activeCondition === conditionName && activeHeatmap) return;

    const normKey = conditionName.toLowerCase();
    setActiveCondition(conditionName);

    // Use cached heatmap if available
    if (gradcamCache[normKey]) {
      setActiveHeatmap(gradcamCache[normKey]);
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
        [normKey]: data.heatmap_base64,
      }));
    } catch (err) {
      console.error('Error fetching class-specific Grad-CAM:', err);
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
      console.error('Failed to export multi-label PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Sort findings descending by probability
  const sortedFindings = result ? [...result.findings].sort((a, b) => b.probability - a.probability) : [];
  const detectedCount = sortedFindings.filter((f) => f.detected).length;
  const isHighRisk = result ? result.primary_confidence >= 0.5 : false;

  return (
    <div className="clinical-card p-6 lg:p-8 flex flex-col justify-between min-h-[560px]">
      <div>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D9E2EA] mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#163B5C] tracking-tight">Multi-Label Thoracic Screening</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAF1F6] text-[#315D7D] font-bold border border-[#D0DFEB]">
                v2.0 NIH-14
              </span>
            </div>
            <p className="text-xs text-[#64748B]">DenseNet-121 14-output differential screening & dynamic Grad-CAM</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetricsModal(true)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#EAF1F6] hover:bg-[#D0DFEB] text-[#163B5C] border border-[#D0DFEB] transition flex items-center gap-1 cursor-pointer"
              title="Held-out test set benchmark scores"
            >
              <span>📊</span>
              <span>Benchmark (AUC 0.8057)</span>
            </button>
            {result && (
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#EAF1F6] border border-[#D0DFEB] text-[#163B5C]">
                EXAM: {result.examination_id.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* Dual Frame PACS Viewer */}
        {result?.heatmap_base64 ? (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold">
                Diagnostic Imagery & Spatial Activation
              </span>
              {activeCondition && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#EAF1F6] text-[#315D7D] border border-[#D0DFEB] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D8C87]"></span>
                  Visualizing: {activeCondition.replace('_', ' ')}
                  {activeCondition === result.primary_finding && ' (Primary)'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Input Radiograph Frame */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#64748B]">
                  <span>Input Radiograph</span>
                  <span>Anatomical</span>
                </div>
                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#243447]">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Original Radiograph" className="object-contain h-full w-full" />
                  ) : (
                    <div className="text-center p-4">
                      <span className="block text-[#94A3B8] text-xs font-mono">16-bit DICOM File</span>
                      <span className="text-[10px] text-[#64748B]">Windowed Min/Max RGB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Class-Specific Grad-CAM Heatmap Frame */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#163B5C] font-semibold">
                  <span>Grad-CAM Activation Map</span>
                  <span className="text-[#3D8C87]">Norm5 Layer</span>
                </div>
                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#315D7D] relative overflow-hidden">
                  {loadingGradcam ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                      <span className="w-6 h-6 border-2 border-[#315D7D]/40 border-t-[#3D8C87] rounded-full animate-spin"></span>
                      <span className="text-[11px] text-[#94A3B8] font-mono">
                        Hooking {activeCondition} gradients...
                      </span>
                    </div>
                  ) : activeHeatmap ? (
                    <img
                      src={activeHeatmap}
                      alt={`Grad-CAM for ${activeCondition}`}
                      className="object-contain h-full w-full"
                    />
                  ) : (
                    <div className="text-center p-4 text-[#94A3B8] text-xs font-mono">
                      <span>Heatmap unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] italic pt-1">
              Select any finding in the table below to dynamically map its spatial Grad-CAM activation.
            </p>
          </div>
        ) : previewUrl ? (
          <div className="mb-6 space-y-1.5">
            <span className="block text-[10px] font-mono uppercase text-[#64748B]">Scan Preview</span>
            <div className="pacs-viewer-frame max-h-[260px] flex justify-center p-2 rounded-lg bg-[#0B131C]">
              <img src={previewUrl} alt="X-Ray Preview" className="object-contain max-h-[240px]" />
            </div>
          </div>
        ) : null}

        {/* Results Area */}
        {result ? (
          <div className="space-y-5">
            {/* Primary Finding Banner */}
            <div
              className={`p-5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isHighRisk
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  : result.primary_confidence >= 0.3
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                }`}
            >
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80 block">
                  Primary Radiographic Finding
                </span>
                <div className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                  {result.primary_finding.replace('_', ' ')}
                </div>
                <div className="text-xs font-mono font-medium mt-0.5">
                  Top Probability: {(result.primary_confidence * 100).toFixed(1)}%
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <div
                  className={`px-3 py-1.5 rounded-md font-mono font-bold text-xs border ${isHighRisk
                      ? 'bg-[#FEE2E2] border-[#F87171] text-[#991B1B]'
                      : result.primary_confidence >= 0.3
                        ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                        : 'bg-[#DCFCE7] border-[#4ADE80] text-[#166534]'
                    }`}
                >
                  {isHighRisk ? 'PATHOLOGY DETECTED (≥50%)' : result.primary_confidence >= 0.3 ? 'MODERATE SUSPICION' : 'NORMAL / LOW RISK'}
                </div>
                <span className="text-[11px] font-mono opacity-80">
                  {detectedCount} of 14 findings flagged
                </span>
              </div>
            </div>

            {/* Findings Breakdown Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#163B5C]">Pathology Findings Spectrum (14 Conditions)</span>
                <span className="font-mono text-[#64748B] text-[11px]">Threshold: 50.0%</span>
              </div>

              <div className="border border-[#D9E2EA] rounded-lg overflow-hidden bg-white max-h-[340px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#EAF1F6] border-b border-[#D9E2EA] text-[10px] font-mono uppercase text-[#163B5C] font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3">Finding</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 w-36">Confidence Bar</th>
                      <th className="py-2 px-3 text-right">Prob</th>
                      <th className="py-2 px-3 text-center">CAM</th>
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
                          className={`transition-colors cursor-pointer ${isCurrentActive ? 'bg-[#EAF1F6] font-semibold' : 'hover:bg-[#F8FAFC]'
                            }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              {isCurrentActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3D8C87] shrink-0"></span>
                              )}
                              <span className="text-[#163B5C]">
                                {finding.condition.replace('_', ' ')}
                              </span>
                              {finding.condition === result.primary_finding && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#315D7D] text-white">
                                  TOP
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${isHigh
                                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                                  : isModerate
                                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                                }`}
                            >
                              {isHigh ? 'DETECTED' : isModerate ? 'MODERATE' : 'NORMAL'}
                            </span>
                          </td>

                          <td className="py-2 px-3">
                            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${isHigh ? 'bg-[#DC2626]' : isModerate ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]'
                                  }`}
                                style={{ width: `${Math.min(finding.probability * 100, 100)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-2 px-3 text-right font-mono font-bold text-[#163B5C]">
                            {pct}%
                          </td>

                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectConditionGradcam(finding.condition);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${isCurrentActive
                                  ? 'bg-[#163B5C] text-white font-bold'
                                  : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#EAF1F6]'
                                }`}
                            >
                              {isCurrentActive ? 'Active' : 'CAM'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadReport}
                disabled={generatingPdf}
                className="px-4 py-2.5 rounded-lg font-medium text-xs bg-[#163B5C] hover:bg-[#315D7D] text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {generatingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Compiling 14-Finding PDF...</span>
                  </>
                ) : (
                  <>
                    <span>📄 Download 14-Finding PDF Report</span>
                  </>
                )}
              </button>

              {patientId && (
                <button
                  onClick={() => navigate(`/patients/${patientId}`)}
                  className="px-4 py-2.5 rounded-lg font-medium text-xs bg-white hover:bg-[#EAF1F6] text-[#163B5C] border border-[#D9E2EA] transition cursor-pointer"
                >
                  👤 View Patient Record
                </button>
              )}

              <button
                onClick={onClear}
                className="px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#64748B] hover:text-[#163B5C] transition cursor-pointer"
              >
                Clear & Screen Another
              </button>
            </div>
          </div>
        ) : (
          /* Awaiting Scan Empty State */
          <div className="h-64 border border-dashed border-[#D9E2EA] rounded-lg flex flex-col items-center justify-center text-center p-6 bg-[#F8FAFC]">
            <div className="w-10 h-10 rounded-full bg-[#EAF1F6] flex items-center justify-center text-[#163B5C] text-lg mb-3">
              🔬
            </div>
            <h4 className="text-sm font-semibold text-[#163B5C] mb-1">Awaiting 14-Pathology AI Analysis</h4>
            <p className="text-xs text-[#64748B] max-w-sm mb-4">
              Select a patient and ingest a chest radiograph, then initiate multi-target screening across 14 thoracic
              pathologies.
            </p>
            {file && (
              <button
                onClick={onRunInference}
                disabled={loading || !patientId}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition cursor-pointer ${loading || !patientId
                    ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                    : 'bg-[#163B5C] hover:bg-[#315D7D] text-white'
                  }`}
              >
                {loading ? 'Running 14-Pathology Screening...' : 'Run 14-Finding Screening Now'}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2">
            <span className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Clinical Disclaimer */}
      <div className="mt-8 pt-4 border-t border-[#D9E2EA] text-[11px] text-[#64748B] leading-relaxed">
        <strong className="text-[#163B5C]">Multi-Pathology Clinical Protocol:</strong> MedVision v2 evaluates 14 thoracic
        abnormalities using DenseNet-121 feature representation. Decision threshold is set at 50.0% for clinical
        flagging. All automated findings must be correlated by a licensed radiologist.
      </div>

      {/* Held-out Test Set Benchmark Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D9E2EA] space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-base font-bold text-[#163B5C]">Model Performance Benchmark</h3>
                  <p className="text-xs text-[#64748B]">Held-Out Test Set Validation on NIH ChestX-ray14</p>
                </div>
              </div>
              <button
                onClick={() => setShowMetricsModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAF1F6] text-[#475569] hover:text-[#163B5C] flex items-center justify-center transition font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#EAF1F6] border border-[#D0DFEB] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#315D7D] font-bold">
                  Aggregate Discrimination Score
                </span>
                <div className="text-2xl font-black text-[#163B5C]">Mean AUC-ROC: 0.8057</div>
                <p className="text-xs text-[#475569] mt-0.5">
                  DenseNet-121 evaluated across 14 thoracic findings
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#315D7D] text-white font-mono font-bold text-xs">
                VERIFIED
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#163B5C]">Per-Condition Discrimination Performance (AUC):</span>
              <div className="max-h-56 overflow-y-auto border border-[#D9E2EA] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-[#D9E2EA] text-[10px] font-mono uppercase text-[#64748B] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Condition</th>
                      <th className="py-2 px-3 text-right">Held-Out AUC</th>
                      <th className="py-2 px-3 w-28">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {BENCHMARK_AUC_SCORES.map((item) => (
                      <tr key={item.condition} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-[#163B5C]">
                          {item.condition.replace('_', ' ')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#315D7D]">
                          {item.auc.toFixed(4)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-[#3D8C87]" style={{ width: `${item.auc * 100}%` }} />
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
                onClick={() => setShowMetricsModal(false)}
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
