import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBILMN3kO4rsIfcSAfaK4K24kNF2PpxTAk",
  authDomain: "plastik-kan.firebaseapp.com",
  projectId: "plastik-kan",
  storageBucket: "plastik-kan.firebasestorage.app",
  messagingSenderId: "964886131005",
  appId: "1:964886131005:web:c65c64729b749464329554",
  measurementId: "G-QV8WH3E6NT"
};

// Initialize Firebase safely (avoid multi-initialization in HMR)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
