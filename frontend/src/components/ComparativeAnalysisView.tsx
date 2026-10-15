import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Patient } from '../services/patientService';
import { type ComparativeAnalysisResult } from '../types/multilabel';
import { generateConsensusPdfReport } from '../utils/generateConsensusPdfReport';

interface ComparativeAnalysisViewProps {
  patient: Patient | null;
  patientId: string | null;
  file: File | null;
  previewUrl: string | null;
  result: ComparativeAnalysisResult | null;
  loading: boolean;
  error: string | null;
  currentUserToken: string | null;
  onClear: () => void;
  onRunComparison: () => void;
}

export const ComparativeAnalysisView: React.FC<ComparativeAnalysisViewProps> = ({
  patient,
  patientId,
  file,
  previewUrl,
  result,
  loading,
  error,
  onClear,
  onRunComparison,
}) => {
  const navigate = useNavigate();
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  const handleDownloadPdf = async () => {
    if (!result || !patient) return;
    setGeneratingPdf(true);
    try {
      await generateConsensusPdfReport(patient, result);
    } catch (err) {
      console.error('Failed to export consensus report:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Extract top differential findings from v2
  const topFindings = result
    ? [...result.v2_result.findings].sort((a, b) => b.probability - a.probability).slice(0, 4)
    : [];

  const isDiscrepant = result?.clinical_correlation?.discrepancy_detected ?? false;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="clinical-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EAF1F6] text-[#163B5C] flex items-center justify-center font-bold text-lg">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#163B5C]">
                Clinician Comparative "Second Opinion" View
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#163B5C] text-white font-semibold">
                Dual-Pipeline Consensus
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Side-by-side evaluation across Specialized Binary (v1) and Differential Multi-Label (v2) models
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="px-3.5 py-2 rounded-lg font-semibold text-xs bg-[#163B5C] hover:bg-[#315D7D] text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {generatingPdf ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <span>📄 Download Consensus Report</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {result ? (
        <div className="space-y-6">
          {/* Intelligent Clinical Discrepancy Banner */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              isDiscrepant
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{isDiscrepant ? '⚠️' : '✅'}</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  {isDiscrepant
                    ? 'Radiological vs. Etiological Correlation Alert'
                    : 'Diagnostic Consensus & Model Agreement'}
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isDiscrepant
                    ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                    : 'bg-[#DCFCE7] border-[#4ADE80] text-[#166534]'
                }`}
              >
                {isDiscrepant ? 'DISCREPANCY DETECTED' : 'HIGH CONCORDANCE'}
              </span>
            </div>

            <div className="text-sm font-bold text-[#163B5C] mb-1">
              {result.clinical_correlation.summary}
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              {result.clinical_correlation.insight}
            </p>
          </div>

          {/* 1. Dual Radiograph & Heatmap Comparison Grid */}
          <div className="clinical-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold">
                  Dual Explainability Heatmaps
                </span>
                <p className="text-[11px] text-[#64748B]">
                  Simultaneous spatial localization comparison between single-target and multi-label architectures
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF1F6] text-[#163B5C] border border-[#D0DFEB]">
                EXAM: {result.examination_id.slice(0, 10)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Pane: v1 Binary Model Grad-CAM */}
              <div className="space-y-2 p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#163B5C] block">
                      v1 Specialized Model
                    </span>
                    <span className="text-[10px] text-[#315D7D] font-mono">
                      Target: Isolated Pneumonia Opacity
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      result.v1_result.detected
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                    }`}
                  >
                    {(result.v1_result.pneumonia_probability * 100).toFixed(1)}% ({result.v1_result.detected ? 'FLAGGED' : 'NORMAL'})
                  </span>
                </div>

                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#243447]">
                  {result.v1_result.heatmap_base64 ? (
                    <img
                      src={result.v1_result.heatmap_base64}
                      alt="v1 Pneumonia Grad-CAM"
                      className="object-contain h-full w-full"
                    />
                  ) : (
                    <span className="text-xs text-[#94A3B8] font-mono">Heatmap unavailable</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono pt-1">
                  <span>Layer: DenseBlock-4</span>
                  <span>Cutoff: 40.0% Sensitivity Priority</span>
                </div>
              </div>

              {/* Right Pane: v2 Multi-Label Grad-CAM */}
              <div className="space-y-2 p-4 rounded-xl bg-[#F8FAFC] border border-[#D9E2EA]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#163B5C] block">
                      v2 Differential Model (NIH-14)
                    </span>
                    <span className="text-[10px] text-[#315D7D] font-mono">
                      Target: {result.v2_result.primary_finding.replace('_', ' ')} (Primary)
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      result.v2_result.primary_confidence >= 0.5
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    }`}
                  >
                    {(result.v2_result.primary_confidence * 100).toFixed(1)}% (14-Class Top)
                  </span>
                </div>

                <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 rounded-lg bg-[#0B131C] border border-[#315D7D]">
                  {result.v2_result.heatmap_base64 ? (
                    <img
                      src={result.v2_result.heatmap_base64}
                      alt="v2 Multi-Label Grad-CAM"
                      className="object-contain h-full w-full"
                    />
                  ) : (
                    <span className="text-xs text-[#94A3B8] font-mono">Heatmap unavailable</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono pt-1">
                  <span>Layer: Features Norm5</span>
                  <span>Threshold: 50.0% Differential Cutoff</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Comparative Diagnostic Matrix Card */}
          <div className="clinical-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2EA]">
              <div>
                <h3 className="text-sm font-bold text-[#163B5C]">Comparative Diagnostic Matrix</h3>
                <p className="text-[11px] text-[#64748B]">
                  Direct alignment of isolated binary confidence versus 14-condition multi-pathology spectrum
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#315D7D] font-semibold">
                Patient: {patient?.name || 'Assigned'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* v1 Binary Focus Metric */}
              <div className="p-4 rounded-xl bg-white border border-[#D9E2EA] space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-[#64748B] block">
                  Model 1 Focus Target
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-[#163B5C]">Pneumonia Detection</span>
                  <span className="font-mono text-xl font-bold text-[#163B5C]">
                    {(result.v1_result.pneumonia_probability * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="relative w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden my-1">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.v1_result.detected ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
                    }`}
                    style={{
                      width: `${Math.min(result.v1_result.pneumonia_probability * 100, 100)}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#163B5C] z-10"
                    style={{ left: '40%' }}
                    title="Cutoff (40%)"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>0%</span>
                  <span className="text-[#163B5C] font-semibold">▲ 40% Decision Cutoff</span>
                  <span>100%</span>
                </div>
              </div>

              {/* v2 Top Differential Spectrum */}
              <div className="p-4 rounded-xl bg-white border border-[#D9E2EA] space-y-3">
                <span className="text-[10px] font-mono uppercase font-bold text-[#64748B] block">
                  Model 2 Top Differential Findings
                </span>

                <div className="space-y-2">
                  {topFindings.map((finding, idx) => (
                    <div key={finding.condition} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#163B5C]">
                          {idx + 1}. {finding.condition.replace('_', ' ')}
                        </span>
                        <span className="font-mono font-bold text-[#163B5C]">
                          {(finding.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            finding.probability >= 0.5
                              ? 'bg-[#DC2626]'
                              : finding.probability >= 0.3
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#94A3B8]'
                          }`}
                          style={{ width: `${Math.min(finding.probability * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="px-4 py-2.5 rounded-lg font-medium text-xs bg-[#163B5C] hover:bg-[#315D7D] text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {generatingPdf ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Compiling Consensus PDF...</span>
                  </>
                ) : (
                  <>
                    <span>📄 Download Dual-Model Consensus Report</span>
                  </>
                )}
              </button>

              {patientId && (
                <button
                  onClick={() => navigate(`/patients/${patientId}`)}
                  className="px-4 py-2.5 rounded-lg font-medium text-xs bg-white hover:bg-[#EAF1F6] text-[#163B5C] border border-[#D9E2EA] transition cursor-pointer"
                >
                  👤 View Patient Profile
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
        </div>
      ) : (
        /* Empty State */
        <div className="clinical-card p-12 flex flex-col items-center justify-center text-center min-h-[460px] bg-[#F8FAFC]">
          <div className="w-14 h-14 rounded-full bg-[#EAF1F6] flex items-center justify-center text-2xl text-[#163B5C] mb-4">
            ⚖️
          </div>
          <h3 className="text-base font-bold text-[#163B5C] mb-1">
            Awaiting Comparative "Second Opinion" Evaluation
          </h3>
          <p className="text-xs text-[#64748B] max-w-md leading-relaxed mb-6">
            Ingest a chest radiograph and select a patient, then click below to run both the Specialized Binary (v1) and
            Differential Multi-Label (v2) deep learning models simultaneously.
          </p>
          {previewUrl && (
            <div className="mb-4 w-36 h-36 rounded-lg overflow-hidden border border-[#D9E2EA] bg-[#0B131C] flex items-center justify-center p-1 shadow-xs">
              <img src={previewUrl} alt="Selected scan preview" className="object-contain h-full w-full" />
            </div>
          )}
          {file && (
            <button
              onClick={onRunComparison}
              disabled={loading || !patientId}
              className={`px-5 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer ${
                loading || !patientId
                  ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                  : 'bg-[#163B5C] hover:bg-[#315D7D] text-white'
              }`}
            >
              {loading ? 'Running Dual-Model Comparative Inference...' : 'Run Dual-Model Comparison Now'}
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs max-w-md">
              ⚠ {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
