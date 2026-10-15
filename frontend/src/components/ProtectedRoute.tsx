import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  // Show a loading state while Firebase checks the user's session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 text-sm">
        Checking authentication...
      </div>
    );
  }

  // If no user is logged in, redirect to the login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If the user is logged in, render the protected component (like Dashboard)
  return <>{children}</>;
};