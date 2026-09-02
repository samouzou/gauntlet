import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// Pin Admin to the same Firebase project the web client uses.
// On App Hosting, ADC still supplies credentials; projectId avoids
// accidental cross-project NOT_FOUND when discovering the wrong default.
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
  });
}

const adminDb = getFirestore();

export { adminDb };
