'use server';

import { Buffer } from 'buffer';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { runGauntletFlow, type GauntletOutput } from '@/ai/flows/gauntlet-run-flow';

export async function runGauntlet(
  formData: FormData
): Promise<GauntletOutput> {
  const file = formData.get('video') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file) {
    throw new Error('No video file provided.');
  }
  const videoFilename = file.name;

  if (!userId) {
    throw new Error('User is not authenticated.');
  }
  
  const userRef = adminDb.collection('users').doc(userId);
  
  // Add a retry mechanism to handle potential replication delays for new users.
  let userDoc;
  let attempts = 0;
  const maxAttempts = 3;
  const delay = 500; // ms

  while (attempts < maxAttempts) {
    userDoc = await userRef.get();
    if (userDoc.exists) {
      break; // Found the doc, exit loop
    }
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(res => setTimeout(res, delay));
    }
  }

  if (!userDoc || !userDoc.exists) {
      throw new Error('User data not found. Please try again in a moment.');
  }

  const userData = userDoc.data()!;

  if (userData.credits <= 0) {
      throw new Error("You don't have enough credits to run the gauntlet.");
  }
  
  // Convert the File object to a Buffer, then to a base64 data URI on the server.
  // This is more robust than using the client-side FileReader.
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const videoDataUri = `data:${file.type};base64,${base64}`;

  // Step 1: Run the AI analysis flow first. This is the most time-consuming step.
  const analysisResult = await runGauntletFlow({ videoDataUri });

  // Step 2 & 3: In the background, update user stats and create a run record.
  // We do not await this promise, allowing the function to return to the client immediately.
  const updatePromise = (async () => {
    const batch = adminDb.batch();

    // Update user stats
    const newHighScore = Math.max(userData.high_score || 0, analysisResult.survivability_score);
    batch.update(userRef, {
      credits: FieldValue.increment(-1),
      total_runs: FieldValue.increment(1),
      high_score: newHighScore
    });

    // Create the gauntlet run history record
    const runRef = adminDb.collection('users').doc(userId).collection('gauntlet_runs').doc();
    batch.set(runRef, {
      userId: userId,
      timestamp: FieldValue.serverTimestamp(),
      video_filename: videoFilename,
      ...analysisResult
    });
    
    await batch.commit();
  })();
  
  // Log any errors that occur during the background database writes.
  updatePromise.catch(err => {
    console.warn("Failed to save gauntlet run and update user stats:", err);
  });

  // Step 4: Return the analysis result to the client.
  return analysisResult;
}
