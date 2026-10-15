import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPatientsByDoctor, type Patient } from '../services/patientService';
import { AppLayout } from '../components/AppLayout';
import { generatePdfReport } from '../utils/generatePdfReport';

interface PredictionResult {
  examination_id: string;
  filename: string;
  prediction: string;
  confidence: number;
  gradcam?: string;
}

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get('patientId');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [availablePatients, setAvailablePatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Fetch patient details if patientId is provided in URL
  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) {
        setPatient(null);
        return;
      }
      try {
        const docRef = doc(db, 'patients', patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
        }
      } catch (err) {
        console.error('Error fetching patient details:', err);
      }
    };
    fetchPatient();
  }, [patientId]);

  // Load patient list so clinician can pick/switch patient on the fly
  useEffect(() => {
    const loadDoctorPatients = async () => {
      if (!currentUser) return;
      setLoadingPatients(true);
      try {
        const patients = await getPatientsByDoctor(currentUser.uid);
        setAvailablePatients(patients);
      } catch (err) {
        console.error('Failed to load doctor patients:', err);
      } finally {
        setLoadingPatients(false);
      }
    };
    loadDoctorPatients();
  }, [currentUser]);

  const handlePatientSelect = (selectedId: string) => {
    if (selectedId) {
      setSearchParams({ patientId: selectedId });
      setResult(null);
      setError(null);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);

    if (!selectedFile.name.toLowerCase().endsWith('.dcm')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;

    if (!patientId) {
      setError('Please select or register a patient before screening.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', patientId);

      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Inference pipeline error. Please verify backend server is active.');
      }

      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (err) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Error connecting to inference backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!result || !patient) return;
    setGeneratingPdf(true);
    try {
      await generatePdfReport(patient, {
        id: result.examination_id,
        prediction: result.prediction,
        confidence: result.confidence,
        filename: result.filename,
        gradcam: result.gradcam,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const isHighRisk = result ? result.confidence >= 0.40 : false;

  return (
    <AppLayout breadcrumbs={[{ label: 'Clinical Workspace' }, { label: 'X-Ray Screening' }]}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Patient Context & Upload Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Patient Selection Card */}
          <div className="clinical-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#315D7D]"></span>
                Patient Context
              </span>
              <button
                onClick={() => navigate('/add-patient')}
                className="text-xs text-[#315D7D] hover:text-[#163B5C] font-medium transition"
              >
                + Register New
              </button>
            </div>

            {patient ? (
              <div className="p-4 rounded-lg bg-[#EAF1F6] border border-[#D0DFEB] flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#163B5C]">{patient.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#475569] font-mono">
                    <span className="font-semibold text-[#163B5C]">{patient.patientCode}</span>
                    <span>•</span>
                    <span>{patient.age} Y / {patient.sex}</span>
                    {patient.bloodGroup && (
                      <>
                        <span>•</span>
                        <span className="text-[#3D8C87] font-semibold">{patient.bloodGroup}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSearchParams({})}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-white hover:bg-[#F8FAFC] text-[#475569] border border-[#D9E2EA] transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#64748B]">
                  Select a registered patient to associate with this screening radiograph:
                </p>
                <select
                  value=""
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full bg-white border border-[#D9E2EA] rounded-lg p-2.5 text-xs text-[#243447] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                  disabled={loadingPatients}
                >
                  <option value="" disabled>
                    {loadingPatients ? 'Loading patient list...' : 'Choose patient from directory...'}
                  </option>
                  {availablePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.patientCode} • Age {p.age})
                    </option>
                  ))}
                </select>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-[#94A3B8]">or</span>{' '}
                  <button
                    onClick={() => navigate('/patients')}
                    className="text-xs text-[#315D7D] hover:text-[#163B5C] underline font-medium"
                  >
                    browse complete patient directory
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Radiograph Ingestion Card */}
          <div className="clinical-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-semibold">
                Radiograph Ingestion
              </span>
              <span className="text-[10px] font-mono text-[#64748B] uppercase">
                DICOM / PNG / JPEG
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[200px] ${
                !patientId
                  ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-60 cursor-not-allowed'
                  : isDragging
                  ? 'border-[#315D7D] bg-[#EAF1F6]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#315D7D] cursor-pointer'
              }`}
            >
              <input
                type="file"
                accept=".dcm,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                id="xray-upload"
                disabled={!patientId}
              />
              <label
                htmlFor="xray-upload"
                className={`flex flex-col items-center ${patientId ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#EAF1F6] text-[#315D7D] flex items-center justify-center text-lg mb-3">
                  🫁
                </div>
                <span className="block text-sm font-semibold text-[#163B5C] mb-1">
                  Click to browse or drop radiograph
                </span>
                <span className="block text-xs text-[#64748B] max-w-xs">
                  Native 16-bit DICOM (.dcm) & standard PNG/JPEG formats supported
                </span>
              </label>
            </div>

            {/* Selected File Details */}
            {file && (
              <div className="mt-4 p-3 bg-[#EAF1F6] rounded-lg border border-[#D0DFEB] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white text-[#163B5C] border border-[#CBD5E1] uppercase font-semibold">
                    {file.name.split('.').pop() || 'FILE'}
                  </span>
                  <span className="truncate text-[#163B5C] font-medium">{file.name}</span>
                </div>
                <span className="text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            )}

            {/* Submit Inference Button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading || !patientId}
              className={`w-full mt-5 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                !file || loading || !patientId
                  ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
                  : 'text-white bg-[#315D7D] hover:bg-[#163B5C]'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>Generating Grad-CAM & Running Inference...</span>
                </>
              ) : (
                <span>Analyze Radiograph with AI</span>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2">
                <span className="font-bold">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Diagnostic Findings & Explainability (7 cols) */}
        <div className="lg:col-span-7 clinical-card p-6 lg:p-8 flex flex-col justify-between min-h-[560px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#D9E2EA] mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#163B5C] tracking-tight">Diagnostic Analysis</h2>
                <p className="text-xs text-[#64748B]">DenseNet-121 Feature Extraction & Grad-CAM Spatial Localization</p>
              </div>
              {result && (
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#EAF1F6] border border-[#D0DFEB] text-[#163B5C]">
                  EXAM: {result.examination_id.slice(0, 8)}
                </span>
              )}
            </div>

            {/* Imagery Comparison Container */}
            {result?.gradcam ? (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input Radiograph Frame */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#64748B]">
                    <span>Input Radiograph</span>
                    <span>Anatomical</span>
                  </div>
                  <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2">
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

                {/* Grad-CAM Heatmap Frame */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#163B5C] font-semibold">
                    <span>Grad-CAM Activation Map</span>
                    <span className="text-[#3D8C87]">DenseBlock-4</span>
                  </div>
                  <div className="pacs-viewer-frame aspect-square flex items-center justify-center p-2 border-[#315D7D]">
                    <img src={result.gradcam} alt="Grad-CAM Spatial Heatmap" className="object-contain h-full w-full" />
                  </div>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="mb-6 space-y-1.5">
                <span className="block text-[10px] font-mono uppercase text-[#64748B]">Scan Preview</span>
                <div className="pacs-viewer-frame max-h-[260px] flex justify-center p-2">
                  <img src={previewUrl} alt="X-Ray Preview" className="object-contain max-h-[240px]" />
                </div>
              </div>
            ) : null}

            {/* Diagnostic Probability & Metrics */}
            {result ? (
              <div className="space-y-5">
                {/* Clinical Classification Banner */}
                <div
                  className={`p-5 rounded-lg border flex items-center justify-between ${
                    isHighRisk
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold opacity-80 block">
                      Screening Classification
                    </span>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                      {result.prediction}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-md font-mono font-bold text-xs border ${
                      isHighRisk
                        ? 'bg-[#FEE2E2] border-[#F87171] text-[#991B1B]'
                        : 'bg-[#DCFCE7] border-[#4ADE80] text-[#166534]'
                    }`}
                  >
                    {isHighRisk ? 'ATTENTION REQUIRED' : 'NORMAL / UNREMARKABLE'}
                  </div>
                </div>

                {/* Model Confidence Meter with 0.40 Threshold Reference */}
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#D9E2EA]">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-[#475569] font-medium">Model Probability (Pneumonia Confidence)</span>
                    <span className="font-mono text-base font-bold text-[#163B5C]">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Visual Bar with Decision Marker */}
                  <div className="relative w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden my-2.5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isHighRisk ? 'bg-[#DC2626]' : 'bg-[#16A34A]'
                      }`}
                      style={{ width: `${Math.min(result.confidence * 100, 100)}%` }}
                    />
                    {/* Decision Threshold Line at 40% */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#163B5C] z-10"
                      style={{ left: '40%' }}
                      title="Clinical Sensitivity Cutoff (40%)"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono">
                    <span>0% (Negative)</span>
                    <span className="text-[#163B5C] font-semibold">▲ 40.0% Decision Threshold (Sensitivity Priority)</span>
                    <span>100% (Positive)</span>
                  </div>
                </div>

                {/* Post-Analysis Action Bar */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={handleDownloadReport}
                    disabled={generatingPdf}
                    className="px-4 py-2.5 rounded-lg font-medium text-xs bg-[#315D7D] hover:bg-[#163B5C] text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    {generatingPdf ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        <span>Compiling PDF Report...</span>
                      </>
                    ) : (
                      <>
                        <span>📄 Download Clinical PDF Report</span>
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
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setResult(null);
                      setError(null);
                    }}
                    className="px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#64748B] hover:text-[#163B5C] transition cursor-pointer"
                  >
                    Clear & Screen Another
                  </button>
                </div>
              </div>
            ) : (
              /* Awaiting Scan Empty State */
              <div className="h-64 border border-dashed border-[#D9E2EA] rounded-lg flex flex-col items-center justify-center text-center p-6 bg-[#F8FAFC]">
                <div className="w-10 h-10 rounded-full bg-[#EAF1F6] flex items-center justify-center text-[#315D7D] text-lg mb-3">
                  🔬
                </div>
                <h4 className="text-sm font-semibold text-[#163B5C] mb-1">Awaiting Radiograph Analysis</h4>
                <p className="text-xs text-[#64748B] max-w-sm">
                  Select a patient and upload a chest X-ray (.dcm, .png, .jpg) to generate pneumonia probability metrics and spatial Grad-CAM heatmap.
                </p>
              </div>
            )}
          </div>

          {/* Clinical Disclaimer */}
          <div className="mt-8 pt-4 border-t border-[#D9E2EA] text-[11px] text-[#64748B] leading-relaxed">
            <strong className="text-[#163B5C]">Clinical Protocol:</strong> This screening inference operates at a calibrated sensitivity cutoff of 0.40 to minimize False Negatives. Findings must be validated by a certified radiologist before diagnostic or therapeutic actions are taken.
          </div>
        </div>

      </div>
    </AppLayout>
  );
};