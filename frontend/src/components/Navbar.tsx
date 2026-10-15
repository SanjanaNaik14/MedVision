import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  variant?: 'landing' | 'app';
}

export const Navbar: React.FC<NavbarProps> = ({ variant = 'app' }) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const navLinks = [
    { name: 'Screening Workspace', path: '/dashboard' },
    { name: 'Patient Directory', path: '/patients' },
    { name: 'Register Patient', path: '/add-patient' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-[#D9E2EA] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Identity */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#163B5C] flex items-center justify-center text-white font-mono font-bold text-xs tracking-tight shadow-xs">
            MV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#163B5C]">
                MedVision
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#EAF1F6] text-[#163B5C] border border-[#D0DFEB]">
                CDSS v1.0
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] hidden sm:block">AI-Assisted Pulmonary Screening</p>
          </div>
        </Link>

        {/* Workspace Navigation Links */}
        {variant === 'app' && currentUser && (
          <nav className="hidden md:flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#D9E2EA]">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-[#163B5C] font-semibold shadow-xs border border-[#D9E2EA]'
                      : 'text-[#475569] hover:text-[#163B5C] hover:bg-white/60'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* User Session & Auth Controls */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-[#243447] truncate max-w-[180px]">
                  {currentUser.email}
                </span>
                <span className="text-[10px] text-[#3D8C87] font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D8C87]"></span>
                  Verified Clinician
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs font-medium text-[#475569] hover:text-[#163B5C] bg-[#F8FAFC] hover:bg-[#EAF1F6] rounded-lg border border-[#D9E2EA] transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-medium text-[#315D7D] hover:text-[#163B5C] hover:bg-[#EAF1F6] rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#315D7D] hover:bg-[#163B5C] rounded-lg shadow-xs transition"
              >
                Clinician Access
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
