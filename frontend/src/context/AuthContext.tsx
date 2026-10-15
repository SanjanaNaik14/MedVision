// MedVision/frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

// Define the shape of our context data
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Create the Context
const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  loading: true,
  logout: async () => {} 
});

// Export a custom hook so other files can easily ask: const { currentUser } = useAuth();
export const useAuth = () => useContext(AuthContext);

// The Provider wraps our whole app and listens to Firebase for login changes
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Define the logout function
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    // Firebase constantly watches if the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Done checking
    });

    return unsubscribe; // Cleanup when the app closes
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};