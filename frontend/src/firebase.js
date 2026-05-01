// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDPFwU273rVzx6dGSTL3zto2cHXXoqWtyE",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "electricity-bill-4b0b1.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "electricity-bill-4b0b1",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "electricity-bill-4b0b1.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "121870147574",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:121870147574:web:2b4046a070ea9a82de71d7",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-4Z6H850TB8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
