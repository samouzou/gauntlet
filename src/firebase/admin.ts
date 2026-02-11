import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// In a Google Cloud environment like App Hosting, initializeApp() without
// arguments automatically discovers the project credentials.
// This ensures the Admin SDK is initialized only once.
if (getApps().length === 0) {
  initializeApp();
}

// getFirestore() will use the default (and only) app instance.
const adminDb = getFirestore();

export { adminDb };
