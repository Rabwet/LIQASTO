/**
 * LIQASTO — Firebase Configuration
 * Replace the placeholder values below with your actual Firebase project config.
 * Get these from: Firebase Console → Project Settings → General → Your apps → Firebase SDK snippet
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// ── Firebase Configuration ──
// Replace these with your actual Firebase project credentials
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if actual credentials have been configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
);

// ── Cloud Functions Base URL ──
// For local emulator: http://localhost:5001/YOUR_PROJECT_ID/us-central1
// For production: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
export const FUNCTIONS_URL = isFirebaseConfigured
  ? `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`
  : 'http://localhost:5001/liqasto-demo/us-central1';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Only attempt persistence if valid credentials are provided to prevent console auth/invalid-api-key error
if (isFirebaseConfigured) {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Notice setting auth persistence:', error?.message || error);
  });
} else {
  console.info(
    '%c[LIQASTO] Running in interactive Demo Mode with sample catalog. To connect to live Firestore & Auth, update credentials in public/js/firebase-config.js.',
    'color: #10b981; font-weight: bold; font-size: 11px;'
  );
}

export default app;
