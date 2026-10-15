import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface PredictionResult {
  examination_id: string;
  filename: string;
  prediction: string;
  confidence: number;
  gradcam?: string;
}

export const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get('patientId');

  const [patientName, setPatientName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!patientId) return;
      try {
        const docRef = doc(db, 'patients', patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPatientName(docSnap.data().name);
        }
      } catch (err) {
        console.error("Error fetching patient details:", err);
      }
    };
    fetchPatient();
  }, [patientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setError(null);

      if (!selectedFile.name.endsWith('.dcm')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !currentUser) return;
    
    if (!patientId) {
      setError("Please select a patient from the Patients list before uploading an X-Ray.");
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
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Inference failed. Please check backend logs.');
      }

      const data: PredictionResult = await response.json();
      setResult(data);
    } catch (err) {
      const errorObject = err as Error;
      setError(errorObject.message || 'Error connecting to inference server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-8 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">MedVision</h1>
          <p className="text-xs text-slate-400">Clinical Decision Support System</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/patients')} className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition">
            Patient List
          </button>
          <span className="text-sm text-slate-400 border-l border-slate-700 pl-4">{currentUser?.email}</span>
          <button onClick={logout} className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">
            Upload Chest X-Ray
          </h2>
          
          {patientName ? (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800/50 text-blue-200 text-sm rounded-lg flex justify-between items-center">
              <span>Selected Patient: <strong>{patientName}</strong></span>
              <button onClick={() => navigate('/patients')} className="text-xs underline text-blue-400 hover:text-blue-300">Change</button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-orange-950/40 border border-orange-800/50 text-orange-200 text-sm rounded-lg">
              No patient selected. Please select a patient from the <button onClick={() => navigate('/patients')} className="underline">Patient List</button> first.
            </div>
          )}

          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition flex flex-col items-center justify-center min-h-[220px] ${patientId ? 'border-slate-700 hover:border-blue-500/50 cursor-pointer' : 'border-slate-800 opacity-50 cursor-not-allowed'}`}>
            <input
              type="file"
              accept=".dcm,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="xray-upload"
              disabled={!patientId}
            />
            <label htmlFor="xray-upload" className={patientId ? 'cursor-pointer' : 'cursor-not-allowed'}>
              <span className="block text-sm text-slate-300 font-medium mb-1">Click to browse or drop file here</span>
              <span className="block text-xs text-slate-500">Supports DICOM (.dcm), PNG, JPG</span>
            </label>
          </div>

          {file && (
            <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center text-xs">
              <span className="truncate text-slate-300">{file.name}</span>
              <span className="text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading || !patientId}
            className={`w-full mt-4 py-2.5 rounded-lg font-medium text-sm transition ${
              !file || loading || !patientId
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {loading ? 'Generating Grad-CAM & Analyzing...' : 'Analyze Image'}
          </button>

          {error && <div className="mt-4 p-3 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded">{error}</div>}
        </div>

        {/* Results Column */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Diagnostic Findings</h2>
            
            {/* Display Images (Original & Grad-CAM) */}
            {result?.gradcam ? (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase mb-1">Original X-Ray</span>
                  <div className="rounded-lg overflow-hidden border border-slate-700 bg-black h-36 flex justify-center">
                    {previewUrl && <img src={previewUrl} alt="Original" className="object-contain h-full" />}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-blue-400 uppercase mb-1">Grad-CAM Heatmap</span>
                  <div className="rounded-lg overflow-hidden border border-blue-500/50 bg-black h-36 flex justify-center">
                    <img src={result.gradcam} alt="Grad-CAM" className="object-contain h-full" />
                  </div>
                </div>
              </div>
            ) : previewUrl && (
              <div className="mb-4 rounded-lg overflow-hidden border border-slate-700 max-h-[180px] bg-black flex justify-center">
                <img src={previewUrl} alt="X-Ray Preview" className="object-contain" />
              </div>
            )}

            {result ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  result.confidence >= 0.40 
                    ? 'bg-red-950/40 border-red-800/60 text-red-200' 
                    : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                }`}>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-75">Screening Status</span>
                  <div className="text-xl font-bold mt-1">{result.prediction}</div>
                </div>

                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Model Confidence (Pneumonia Probability)</span>
                    <span className="font-mono text-slate-200">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.confidence >= 0.40 ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${result.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-40 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500 text-center p-4">
                Upload a chest X-ray image and click "Analyze Image" to view AI decision support metrics.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
            <strong>Medical Disclaimer:</strong> This AI output is intended for research and screening support only. It is not a definitive medical diagnosis and must be interpreted by a qualified healthcare professional.
          </div>
        </div>
      </main>
    </div>
  );
};