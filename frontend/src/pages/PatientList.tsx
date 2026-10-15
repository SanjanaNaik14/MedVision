import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientsByDoctor, type Patient } from '../services/patientService';

export const PatientList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!currentUser) return;
      try {
        const data = await getPatientsByDoctor(currentUser.uid);
        setPatients(data);
      } catch (err) {
        setError('Failed to load patients.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [currentUser]);

  // Filter patients based on search input (name or code)
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.patientCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-8 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">Patients</h1>
          <p className="text-xs text-slate-400">Manage and view your registered patients.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition">
            Back to Dashboard
          </button>
          <button onClick={() => navigate('/add-patient')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 transition">
            + Add Patient
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto mt-8">
        {/* Search Bar */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Search by patient name or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/2 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {error && <div className="p-4 bg-red-950/50 border border-red-800/50 text-red-300 text-sm rounded-lg mb-6">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading patients...</div>
        ) : filteredPatients.length > 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Patient Code</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Age / Sex</th>
                  <th className="px-6 py-4 font-medium">Date Registered</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-800/80 transition">
                    <td className="px-6 py-4 font-mono text-slate-400">{patient.patientCode}</td>
                    <td className="px-6 py-4 font-medium text-slate-200">{patient.name}</td>
                    <td className="px-6 py-4">{patient.age} / {patient.sex}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {patient.createdAt && 'toDate' in patient.createdAt 
                        ? patient.createdAt.toDate().toLocaleDateString() 
                        : 'Unknown Date'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/patients/${patient.id}`} className="text-blue-400 hover:text-blue-300 font-medium text-xs uppercase tracking-wider">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <p className="text-slate-400 text-sm mb-4">No patients found.</p>
            {searchQuery === '' && (
              <button onClick={() => navigate('/add-patient')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition">
                Add Your First Patient
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};