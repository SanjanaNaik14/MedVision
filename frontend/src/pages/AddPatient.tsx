import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addPatient } from '../services/patientService';
import { AppLayout } from '../components/AppLayout';

export const AddPatient: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    patientCode: '',
    age: '',
    sex: 'Male' as 'Male' | 'Female' | 'Other',
    bloodGroup: '',
    allergies: '',
    knownConditions: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const generatedPatientId = `PAT-${Math.floor(10000 + Math.random() * 90000)}`;
      const docId = await addPatient({
        name: formData.name,
        patientCode: formData.patientCode,
        age: parseInt(formData.age),
        sex: formData.sex,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        knownConditions: formData.knownConditions,
        doctorId: currentUser.uid,
        patientId: generatedPatientId,
      });

      // Redirect to newly registered patient profile
      navigate(`/patients/${docId}`);
    } catch (err) {
      setError('Failed to record patient in Firestore database. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: 'Clinical Workspace' },
        { label: 'Patient Directory', href: '/patients' },
        { label: 'Register Patient' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="pb-6 border-b border-[#D9E2EA]">
          <h1 className="text-2xl font-bold tracking-tight text-[#163B5C]">Register Clinical Patient</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Establish a longitudinal medical record and assign a unique identifier for chest X-ray screening.
          </p>
        </div>

        {/* Form Container */}
        <div className="clinical-card p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2">
              <span className="font-bold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Demographics */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-bold block mb-4">
                Primary Demographics
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Full Legal Name *
                  </label>
                  <input
                    required
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                    placeholder="e.g. Eleanor Vance"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Hospital Patient Code *
                  </label>
                  <input
                    required
                    type="text"
                    name="patientCode"
                    value={formData.patientCode}
                    onChange={handleChange}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition font-mono"
                    placeholder="e.g. HOS-2026-0042"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Age (Years) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="125"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                    placeholder="e.g. 54"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Biological Sex *
                  </label>
                  <select
                    required
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] focus:border-[#315D7D] outline-none transition cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Blood Group (Optional)
                  </label>
                  <input
                    type="text"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                    placeholder="e.g. O positive (O+)"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Clinical Annotations */}
            <div className="pt-4 border-t border-[#D9E2EA]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#163B5C] font-bold block mb-4">
                Clinical Context & History
              </span>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Known Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                    placeholder="e.g. Penicillin, contrast dye, latex (or None reported)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
                    Pre-existing Conditions / Medical History
                  </label>
                  <textarea
                    name="knownConditions"
                    value={formData.knownConditions}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2 text-xs text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
                    placeholder="e.g. Chronic obstructive pulmonary disease (COPD), asthma, hypertension"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#D9E2EA]">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#163B5C] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg font-semibold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer ${
                  loading
                    ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
                    : 'text-white bg-[#315D7D] hover:bg-[#163B5C]'
                }`}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Saving Patient Record...</span>
                  </>
                ) : (
                  <span>Save & Open Profile</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};