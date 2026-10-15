import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Landing } from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { AddPatient } from './pages/AddPatient';
import { PatientList } from './pages/PatientList';
import { PatientProfile } from './pages/PatientProfile';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/patients" 
            element={
              <ProtectedRoute>
                <PatientList />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id" 
            element={
              <ProtectedRoute>
                <PatientProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/add-patient" 
            element={
              <ProtectedRoute>
                <AddPatient />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}