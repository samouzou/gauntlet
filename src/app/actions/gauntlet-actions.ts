'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { runGauntletFlow, type GauntletOutput } from '@/ai/flows/gauntlet-run-flow';

interface RunGauntletProps {
  videoDataUri: string;
  videoFilename: string;
  userId: string;
}

export async function runGauntlet(
  props: RunGauntletProps
): Promise<GauntletOutput> {
  const { userId, videoDataUri, videoFilename } = props;

  if (!userId) {
    throw new Error('User is not authenticated.');
  }
  
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
      throw new Error('User not found.');
  }

  const userData = userDoc.data()!;

  if (userData.credits <= 0) {
      throw new Error("You don't have enough credits to run the gauntlet.");
  }
  
  // Step 1: Run the AI analysis flow first. This is the most time-consuming step.
  const analysisResult = await runGauntletFlow({ videoDataUri });

  // Step 2: Once the analysis is successful, update the user's stats.
  const newHighScore = Math.max(userData.high_score || 0, analysisResult.survivability_score);
  await userRef.update({
    credits: FieldValue.increment(-1),
    total_runs: FieldValue.increment(1),
    high_score: newHighScore
  });
  
  // Step 3: In the background, create a record of this specific Gauntlet run.
  // This is a non-critical write, so we don't need to block the response for it.
  const runRef = adminDb.collection('users').doc(userId).collection('gauntlet_runs').doc();
  runRef.set({
    userId: userId,
    timestamp: FieldValue.serverTimestamp(),
    video_filename: videoFilename,
    ...analysisResult
  }).catch(err => {
    // Log if saving history fails, but don't fail the whole operation.
    console.warn("Failed to save gauntlet run history:", err)
  });

  // Step 4: Return the analysis result to the client.
  return analysisResult;
}
