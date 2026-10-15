// MedVision/frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // This allows us to change pages

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Send credentials to Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // If successful, navigate to the dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError("Failed to log in. Please check your credentials.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">MedVision Login</h2>
        
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700">Email</label>
            <input 
              type="email" 
              className="w-full border p-2 rounded mt-1" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-gray-700">Password</label>
            <input 
              type="password" 
              className="w-full border p-2 rounded mt-1" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Log In
          </button>
        </form>
        
<div className="mt-6 text-center text-sm text-slate-400">
          Need an account?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition">
            Create one here
          </Link>
        </div>




      </div>
    </div>
  );
}