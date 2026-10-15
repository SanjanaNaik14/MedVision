import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Patient } from '../services/patientService';
import { generatePdfReport } from '../utils/generatePdfReport';
import { AppLayout } from '../components/AppLayout';

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
          setError('Patient record not found in database.');
          setLoading(false);
          return;
        }

        const examsRef = collection(db, 'examinations');
        const q = query(examsRef, where('patientId', '==', id));

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
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Clinical Workspace' }, { label: 'Patient Directory', href: '/patients' }, { label: 'Loading...' }]}>
        <div className="py-24 text-center text-[#64748B] text-xs flex flex-col items-center justify-center gap-3">
          <span className="w-5 h-5 border-2 border-[#315D7D] border-t-transparent rounded-full animate-spin"></span>
          <span>Retrieving patient medical record and examination history...</span>
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Clinical Workspace' }, { label: 'Patient Directory', href: '/patients' }, { label: 'Not Found' }]}>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs rounded-lg">
            {error || 'Patient not found.'}
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="px-4 py-2 bg-[#EAF1F6] hover:bg-[#D0DFEB] text-[#163B5C] text-xs rounded-lg transition"
          >
            ← Return to Patient Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Clinical Workspace' },
        { label: 'Patient Directory', href: '/patients' },
        { label: patient.name },
      ]}
    >
      <div className="space-y-8">
        
        {/* Top Header Card */}
        <div className="clinical-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#163B5C]">
                {patient.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-[#EAF1F6] border border-[#D0DFEB] text-[#163B5C] font-mono text-xs font-semibold">
                {patient.patientCode}
              </span>
            </div>
            <p className="text-xs text-[#64748B] font-mono mt-1.5 flex items-center gap-2">
              <span>System ID: {patient.patientId}</span>
              <span>•</span>
              <span>
                Registered:{' '}
                {patient.createdAt && 'toDate' in patient.createdAt
                  ? patient.createdAt.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/dashboard?patientId=${patient.id}`)}
              className="px-5 py-2 rounded-lg font-semibold text-xs text-white bg-[#315D7D] hover:bg-[#163B5C] shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ New X-Ray Screening</span>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Demographics & Clinical Information (4 cols) */}
          <div className="lg:col-span-4 clinical-card p-6 space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-bold border-b border-[#D9E2EA] pb-3 flex items-center gap-1.5">
              <span>Demographic & Clinical Profile</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-[10px] font-mono uppercase text-[#64748B] mb-0.5">
                  Age / Biological Sex
                </span>
                <span className="text-sm font-medium text-[#243447]">
                  {patient.age} Years • {patient.sex}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-mono uppercase text-[#64748B] mb-0.5">
                  Blood Group
                </span>
                <span className="text-sm font-semibold text-[#3D8C87] font-mono">
                  {patient.bloodGroup || 'Not documented'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-mono uppercase text-[#64748B] mb-0.5">
                  Known Allergies
                </span>
                <div className="mt-1">
                  {patient.allergies && patient.allergies.toLowerCase() !== 'none' ? (
                    <span className="inline-block px-2.5 py-1 rounded bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-medium">
                      ⚠ {patient.allergies}
                    </span>
                  ) : (
                    <span className="text-[#64748B]">None reported</span>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-mono uppercase text-[#64748B] mb-0.5">
                  Pre-Existing Conditions
                </span>
                <p className="text-[#475569] text-xs leading-relaxed mt-1 bg-[#F8FAFC] p-3 rounded-lg border border-[#D9E2EA]">
                  {patient.knownConditions || 'No prior chronic respiratory conditions noted.'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#D9E2EA] text-[11px] text-[#94A3B8] font-mono">
              Attending Clinician UID: {patient.doctorId ? patient.doctorId.slice(0, 10) + '...' : 'System'}
            </div>
          </div>

          {/* Right Column: Longitudinal Examination Timeline (8 cols) */}
          <div className="lg:col-span-8 clinical-card p-6 lg:p-8">
            <div className="flex items-center justify-between border-b border-[#D9E2EA] pb-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-[#163B5C] tracking-tight">Examination History</h2>
                <p className="text-xs text-[#64748B]">Chronological screening timeline and Grad-CAM archives</p>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#EAF1F6] text-[#163B5C] border border-[#D0DFEB]">
                {examinations.length} Scans Archived
              </span>
            </div>

            {examinations.length > 0 ? (
              <div className="space-y-4">
                {examinations.map((exam) => {
                  const isHigh = exam.confidence >= 0.40;
                  return (
                    <div
                      key={exam.id}
                      className="p-5 bg-[#F8FAFC] border border-[#D9E2EA] hover:border-[#CBD5E1] rounded-lg transition-colors flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                    >
                      {/* Thumbnail Container */}
                      <div className="w-full sm:w-28 h-28 pacs-viewer-frame flex-shrink-0 flex items-center justify-center p-1">
                        {exam.gradcam ? (
                          <img
                            src={exam.gradcam}
                            alt="Grad-CAM Activation"
                            className="object-contain h-full w-full"
                          />
                        ) : (
                          <span className="text-[10px] font-mono text-[#64748B]">No Overlay</span>
                        )}
                      </div>

                      {/* Diagnostic Summary */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded border ${
                              isHigh
                                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                            }`}
                          >
                            {exam.prediction}
                          </span>

                          <span className="text-[11px] font-mono text-[#64748B]">
                            {exam.createdAt?.toDate
                              ? exam.createdAt.toDate().toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-[#475569]">
                            Confidence:{' '}
                            <strong className="text-[#163B5C] font-mono">
                              {(exam.confidence * 100).toFixed(1)}%
                            </strong>
                          </span>
                          <span className="text-[#CBD5E1]">•</span>
                          <span className="text-[#64748B] font-mono text-[11px] truncate max-w-xs">
                            File: {exam.filename}
                          </span>
                        </div>

                        <div className="pt-1">
                          <button
                            onClick={() => handleDownloadReport(exam)}
                            disabled={downloadingId === exam.id}
                            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#EAF1F6] text-[#163B5C] border border-[#D9E2EA] text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            {downloadingId === exam.id ? (
                              <>
                                <span className="w-3 h-3 border-2 border-[#315D7D] border-t-transparent rounded-full animate-spin"></span>
                                <span>Generating PDF...</span>
                              </>
                            ) : (
                              <span>📄 Download PDF Report</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 border border-dashed border-[#D9E2EA] rounded-lg flex flex-col items-center justify-center text-center p-6 bg-[#F8FAFC]">
                <div className="w-10 h-10 rounded-full bg-[#EAF1F6] flex items-center justify-center text-[#315D7D] text-lg mb-3">
                  🫁
                </div>
                <h4 className="text-sm font-semibold text-[#163B5C] mb-1">No Examinations Recorded Yet</h4>
                <p className="text-xs text-[#64748B] max-w-sm mb-4">
                  This patient profile currently has no archived chest X-ray scans.
                </p>
                <button
                  onClick={() => navigate(`/dashboard?patientId=${patient.id}`)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#315D7D] hover:bg-[#163B5C] transition shadow-xs"
                >
                  + Perform First Radiograph Scan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};