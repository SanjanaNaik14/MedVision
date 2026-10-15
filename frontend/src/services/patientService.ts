import { collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface Patient {
  id?: string; // Firestore document ID
  patientId: string; // Generated system ID (e.g., PAT-58392)
  patientCode: string; // Hospital/Clinic reference code (e.g., HOS-2026-001)
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  allergies?: string;
  knownConditions?: string;
  doctorId: string; // The UID of the clinician who created this record
  createdAt: Timestamp | Date;
}

// 1. Add a new patient to Firestore
export const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
  try {
    const patientsRef = collection(db, 'patients');
    const docRef = await addDoc(patientsRef, {
      ...patientData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding patient: ", error);
    throw new Error("Could not add patient to database.");
  }
};

// 2. Get all patients belonging to the logged-in clinician
export const getPatientsByDoctor = async (doctorId: string): Promise<Patient[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    const q = query(
      patientsRef, 
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const patients: Patient[] = [];
    
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() } as Patient);
    });
    
    return patients;
  } catch (error) {
    console.error("Error fetching patients: ", error);
    throw new Error("Could not fetch patients from database.");
  }
};

// 3. Delete a patient from the database via backend API
export const deletePatient = async (patientId: string, token?: string | null): Promise<void> => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`http://127.0.0.1:8000/api/patients/${patientId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || 'Could not delete patient from database.');
    }
  } catch (error) {
    console.error("Error deleting patient: ", error);
    throw error;
  }
};