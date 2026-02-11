import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize the Firebase Admin SDK.
if (getApps().length === 0) {
  // This will automatically use Application Default Credentials in the
  // App Hosting environment, which is the most secure and robust method.
  initializeApp();
}

// getFirestore() will use the default app initialized above.
const adminDb = getFirestore();

export { adminDb };
