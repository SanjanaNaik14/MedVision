import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    try {
      setError('');
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create a clinical account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#243447] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md clinical-card p-8 bg-white border border-[#D9E2EA] shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#163B5C] text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
              MV
            </div>
            <span className="font-bold text-xl tracking-tight text-[#163B5C]">
              MedVision
            </span>
          </Link>
          <h2 className="text-xl font-bold tracking-tight text-[#163B5C]">Create Clinical Account</h2>
          <p className="text-[#64748B] text-xs mt-1">Register institutional credentials for X-ray screening</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-2">
            <span className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
              Institutional Email Address
            </label>
            <input
              type="email"
              required
              className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2.5 text-sm text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
              placeholder="clinician@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
              Password (min. 6 characters)
            </label>
            <input
              type="password"
              required
              className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2.5 text-sm text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5 uppercase font-mono tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-white border border-[#D9E2EA] rounded-lg px-3.5 py-2.5 text-sm text-[#243447] placeholder-[#94A3B8] focus:border-[#315D7D] focus:ring-1 focus:ring-[#315D7D] outline-none transition"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
              loading
                ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed border border-[#CBD5E1]'
                : 'text-white bg-[#315D7D] hover:bg-[#163B5C]'
            }`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Registering Account...</span>
              </>
            ) : (
              <span>Complete Registration</span>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 pt-5 border-t border-[#D9E2EA] flex flex-col gap-2.5 text-center text-xs text-[#64748B]">
          <div>
            Already have an account?{' '}
            <Link to="/login" className="text-[#315D7D] hover:text-[#163B5C] font-semibold transition">
              Sign In
            </Link>
          </div>
          <div>
            <Link to="/" className="text-[#94A3B8] hover:text-[#475569] transition font-mono text-[11px]">
              ← Back to Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}