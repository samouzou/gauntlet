'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

if (getApps().length === 0) {
  // This will automatically use Application Default Credentials in the
  // App Hosting environment.
  adminApp = initializeApp();
} else {
  adminApp = getApps()[0];
}

adminDb = getFirestore(adminApp);

export { adminDb };
