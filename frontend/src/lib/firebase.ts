// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBhPFe_oovt6VnCm6zQT-LmMfgyG0Ghbi0",
  authDomain: "quiz-system-cea95.firebaseapp.com",
  projectId: "quiz-system-cea95",
  storageBucket: "quiz-system-cea95.firebasestorage.app",
  messagingSenderId: "1001657210871",
  appId: "1:1001657210871:web:9cdbd40804a933127000f2",
  measurementId: "G-870P6H43QC"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else if (typeof window !== 'undefined') {
  app = getApps()[0];
  auth = getAuth(app);
}

export { auth };
export default app;
