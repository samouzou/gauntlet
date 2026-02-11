'use server';

import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

if (getApps().length === 0) {
  // Explicitly initialize with the project ID from the App Hosting environment
  // to ensure the correct credentials are used.
  app = initializeApp({
    projectId: process.env.GCLOUD_PROJECT,
  });
} else {
  // If already initialized, get the existing app instance.
  app = getApp();
}

// Pass the specific app instance to getFirestore.
const adminDb = getFirestore(app);

export { adminDb };
