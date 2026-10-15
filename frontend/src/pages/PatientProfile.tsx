import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Patient } from '../services/patientService';
import { generatePdfReport } from '../utils/generatePdfReport';

interface ExaminationRecord {
  id: string;
  prediction: string;
  confidence: number;
  filename: string;
  gradcam?: string;
  createdAt: any;
}

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [examinations, setExaminations] = useState<ExaminationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'patients', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
        } else {
          setError('Patient record not found.');
          setLoading(false);
          return;
        }

        const examsRef = collection(db, 'examinations');
        const q = query(
          examsRef, 
          where("patientId", "==", id)
        );
        
        const examSnap = await getDocs(q);
        const examList: ExaminationRecord[] = [];
        
        examSnap.forEach((examDoc) => {
          examList.push({ id: examDoc.id, ...examDoc.data() } as ExaminationRecord);
        });

        examList.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        });

        setExaminations(examList);

      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  const handleDownloadReport = async (exam: ExaminationRecord) => {
    if (!patient) return;
    setDownloadingId(exam.id);
    try {
      await generatePdfReport(patient, exam);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center text-sm">Loading patient profile...</div>;
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center justify-center">
        <div className="p-4 bg-red-950/50 border border-red-800/50 text-red-300 text-sm rounded-lg mb-4">{error}</div>
        <button onClick={() => navigate('/patients')} className="px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-lg">Back to Patient List</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-8 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">{patient.name}</h1>
          <p className="text-xs text-slate-400 font-mono">Code: {patient.patientCode} | ID: {patient.patientId}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/patients')} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
            Back to Patients
          </button>
          <button onClick={() => navigate(`/dashboard?patientId=${patient.id}`)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 transition">
            + New X-Ray Scan
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Demographics */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/50 pb-2">Patient Details</h2>
          
          <div>
            <span className="block text-xs text-slate-400">Age / Sex</span>
            <span className="text-sm font-medium text-slate-200">{patient.age} Yrs / {patient.sex}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400">Blood Group</span>
            <span className="text-sm font-medium text-slate-200">{patient.bloodGroup || 'Not specified'}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400">Allergies</span>
            <span className="text-sm font-medium text-slate-200">{patient.allergies || 'None reported'}</span>
          </div>

          <div>
            <span className="block text-xs text-slate-400">Known Conditions</span>
            <span className="text-sm font-medium text-slate-200">{patient.knownConditions || 'None reported'}</span>
          </div>
        </div>

        {/* Right Column: Examination History */}
        <div className="md:col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-700/50 pb-2 mb-4">Past Examinations</h2>
          
          {examinations.length > 0 ? (
            <div className="space-y-4">
              {examinations.map((exam) => (
                <div key={exam.id} className="p-4 bg-slate-900 border border-slate-700 rounded-lg flex flex-col md:flex-row gap-6 items-center">
                  {/* Thumbnail */}
                  <div className="w-full md:w-32 h-32 bg-black rounded-md overflow-hidden border border-slate-700 flex-shrink-0 flex items-center justify-center">
                    {exam.gradcam ? (
                      <img src={exam.gradcam} alt="Grad-CAM thumbnail" className="object-cover h-full w-full opacity-90 hover:opacity-100 transition" />
                    ) : (
                      <span className="text-xs text-slate-600">No Image</span>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                        exam.confidence >= 0.40 ? 'bg-red-900/50 text-red-300 border border-red-700/50' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                      }`}>
                        {exam.prediction}
                      </span>
                      <span className="text-xs text-slate-500">
                        {exam.createdAt?.toDate ? exam.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-1">
                      Model Confidence: <strong className="text-slate-100">{(exam.confidence * 100).toFixed(1)}%</strong>
                    </p>
                    <p className="text-xs text-slate-500 font-mono truncate">File: {exam.filename}</p>
                    
                    <button
                      onClick={() => handleDownloadReport(exam)}
                      disabled={downloadingId === exam.id}
                      className="mt-3 w-fit px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-medium rounded border border-slate-700 transition flex items-center gap-1.5"
                    >
                      {downloadingId === exam.id ? 'Generating PDF...' : '📄 Download PDF Report'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-500">
              No examination records saved for this patient yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};