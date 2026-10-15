import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addPatient } from '../services/patientService';

export const AddPatient: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    patientCode: '',
    age: '',
    sex: 'Other' as 'Male' | 'Female' | 'Other',
    bloodGroup: '',
    allergies: '',
    knownConditions: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);

    try {
      await addPatient({
        name: formData.name,
        patientCode: formData.patientCode,
        age: parseInt(formData.age),
        sex: formData.sex,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        knownConditions: formData.knownConditions,
        doctorId: currentUser.uid, // Associates patient with the logged-in clinician
        patientId: `PAT-${Math.floor(10000 + Math.random() * 90000)}` // Generates a random 5-digit ID
      });
      
      // Redirect back to dashboard upon success
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to add patient. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="max-w-3xl mx-auto pb-8 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">Add New Patient</h1>
        <p className="text-xs text-slate-400">Enter demographic and clinical details to create a new record.</p>
      </header>

      <main className="max-w-3xl mx-auto mt-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. John Doe" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Hospital Patient Code *</label>
              <input required type="text" name="patientCode" value={formData.patientCode} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. HOS-2026-001" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Age *</label>
              <input required type="number" min="0" max="120" name="age" value={formData.age} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. 45" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sex *</label>
              <select required name="sex" value={formData.sex} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Blood Group</label>
              <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. O+" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Allergies (Optional)</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. Penicillin" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Known Conditions (Optional)</label>
            <textarea name="knownConditions" value={formData.knownConditions} onChange={handleChange} rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" placeholder="e.g. Asthma, Hypertension" />
          </div>

          {error && <div className="p-3 bg-red-950/50 border border-red-800/50 text-red-300 text-xs rounded">{error}</div>}

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition">Cancel</button>
            <button type="submit" disabled={loading} className={`px-6 py-2 rounded-lg font-medium text-sm transition ${loading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}>
              {loading ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};