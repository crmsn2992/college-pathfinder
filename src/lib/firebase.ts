import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDvRFEqmU0oGMVC8koziGW5QRP5fDw1nv4",
  authDomain: "college-pathfinder-566ec.firebaseapp.com",
  projectId: "college-pathfinder-566ec",
  storageBucket: "college-pathfinder-566ec.firebasestorage.app",
  messagingSenderId: "933596174185",
  appId: "1:933596174185:web:f79800d3361a6c0d304ff8",
  measurementId: "G-4LDLQTSLXM",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
