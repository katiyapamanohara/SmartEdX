// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  [key: string]: string | undefined;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase config
const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 
    'messagingSenderId', 'appId'
  ];
  
  for (const field of requiredFields) {
    if (!firebaseConfig[field]) {
      console.error(`Firebase config error: Missing ${field}`);
      console.error('Make sure you have correctly set up your .env file with the NEXT_PUBLIC_FIREBASE_* variables');
      return false;
    }
  }
  return true;
};

// Initialize Firebase
let app;
try {
  if (!validateFirebaseConfig()) {
    throw new Error('Invalid Firebase configuration. Check that your environment variables are loaded correctly.');
  }
  
  app = initializeApp(firebaseConfig);
  
  // Log successful initialization in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Firebase initialized successfully with project ID:', firebaseConfig.projectId);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Analytics may not work in SSR, so we need to check if window is defined
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Auth
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize GitHub provider
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');
githubProvider.addScope('read:user');
githubProvider.setCustomParameters({
  allow_signup: 'true'
});

export { auth, googleProvider, githubProvider, analytics, app };
