import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientsByDoctor, deletePatient, type Patient } from '../services/patientService';
import { AppLayout } from '../components/AppLayout';

export const PatientList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!currentUser) return;
      try {
        const data = await getPatientsByDoctor(currentUser.uid);
        setPatients(data);
      } catch (err) {
        setError('Failed to load clinical patient directory.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [currentUser]);

  // Filter patients based on search input (name, code, or ID)
  const filteredPatients = patients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.patientCode.toLowerCase().includes(query) ||
      (p.patientId && p.patientId.toLowerCase().includes(query))
    );
  });

  const handleDeletePatient = async (patientId: string, patientName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove patient "${patientName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(patientId);
    setError(null);

    try {
      let token: string | null = null;
      if (currentUser) {
        token = await currentUser.getIdToken();
      }
      await deletePatient(patientId, token);
      // Instant state update removing deleted patient from UI
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Failed to remove patient record.');
      console.error('Failed to remove patient:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Clinical Workspace' }, { label: 'Patient Directory' }]}>
      <div className="space-y-6">
        
        {/* Header with Title and Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D9E2EA]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#163B5C] flex items-center gap-2.5">
              <span>Patient Directory</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#EAF1F6] text-[#163B5C] border border-[#D0DFEB]">
                {patients.length} Active Records
              </span>
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Select a patient record to view examination timeline, medical history, or run a new chest radiograph.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/add-patient')}
              className="px-4 py-2 rounded-lg font-semibold text-xs text-white bg-[#315D7D] hover:bg-[#163B5C] shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Register Patient</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by name, hospital code, or PAT ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#D9E2EA] rounded-lg pl-9 pr-8 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-[#64748B] font-mono self-end sm:self-center">
            Showing <strong className="text-[#163B5C]">{filteredPatients.length}</strong> of {patients.length} records
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs">
            {error}
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center text-[#64748B] text-xs flex flex-col items-center justify-center gap-3">
            <span className="w-5 h-5 border-2 border-[#315D7D] border-t-transparent rounded-full animate-spin"></span>
            <span>Querying patient records from Firestore...</span>
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="clinical-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#243447]">
                <thead className="bg-[#EAF1F6] text-[10px] uppercase font-mono tracking-wider text-[#163B5C] border-b border-[#D9E2EA]">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Patient Information</th>
                    <th className="px-6 py-3.5 font-bold">Hospital Code</th>
                    <th className="px-6 py-3.5 font-bold">Demographics</th>
                    <th className="px-6 py-3.5 font-bold">Registered</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E2EA]">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-[#F8FAFC] transition group">
                      {/* Name & ID */}
                      <td className="px-6 py-4">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="font-semibold text-[#163B5C] group-hover:text-[#315D7D] transition text-sm block"
                        >
                          {patient.name}
                        </Link>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          ID: {patient.patientId || 'N/A'}
                        </span>
                      </td>

                      {/* Hospital Code */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-[#EAF1F6] border border-[#D0DFEB] text-[#163B5C] font-mono text-[11px] font-medium">
                          {patient.patientCode}
                        </span>
                      </td>

                      {/* Demographics */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[#475569]">
                          <span>{patient.age} Yrs</span>
                          <span>•</span>
                          <span>{patient.sex}</span>
                          {patient.bloodGroup && (
                            <span className="text-[#3D8C87] font-mono ml-1 font-semibold">({patient.bloodGroup})</span>
                          )}
                        </div>
                      </td>

                      {/* Date Registered */}
                      <td className="px-6 py-4 font-mono text-[#64748B] text-[11px]">
                        {patient.createdAt && 'toDate' in patient.createdAt
                          ? patient.createdAt.toDate().toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/dashboard?patientId=${patient.id}`)}
                            className="px-2.5 py-1.5 rounded-md bg-[#EAF1F6] hover:bg-[#D0DFEB] text-[#163B5C] text-[11px] font-medium transition cursor-pointer"
                            title="Screen New X-Ray"
                          >
                            + Scan X-Ray
                          </button>
                          <Link
                            to={`/patients/${patient.id}`}
                            className="px-2.5 py-1.5 rounded-md bg-white hover:bg-[#F8FAFC] text-[#475569] hover:text-[#163B5C] border border-[#D9E2EA] text-[11px] font-medium transition"
                          >
                            Profile →
                          </Link>
                          <button
                            onClick={() => handleDeletePatient(patient.id!, patient.name)}
                            disabled={deletingId === patient.id}
                            className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                              deletingId === patient.id
                                ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] cursor-not-allowed'
                                : 'bg-white hover:bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                            }`}
                            title="Delete Patient Record"
                          >
                            {deletingId === patient.id ? (
                              <span className="w-3 h-3 border-2 border-[#991B1B]/40 border-t-[#991B1B] rounded-full animate-spin"></span>
                            ) : (
                              <span>🗑️</span>
                            )}
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 clinical-card border-dashed p-8">
            <div className="w-12 h-12 rounded-lg bg-[#EAF1F6] flex items-center justify-center text-[#315D7D] text-xl mx-auto mb-3">
              👤
            </div>
            <h3 className="text-base font-semibold text-[#163B5C] mb-1">No patient records found</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto mb-6">
              {searchQuery
                ? `No patients match the search query "${searchQuery}".`
                : 'Get started by registering your first patient to associate with X-ray scans.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-lg text-xs bg-[#EAF1F6] text-[#163B5C] hover:bg-[#D0DFEB] transition"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                onClick={() => navigate('/add-patient')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#315D7D] hover:bg-[#163B5C] shadow-xs transition"
              >
                + Register First Patient
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};