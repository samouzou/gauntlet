'use server';

import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { runGauntletFlow, type GauntletOutput } from '@/ai/flows/gauntlet-run-flow';

interface RunGauntletProps {
  videoDataUri: string;
  userId: string;
}

export async function runGauntlet(
  props: RunGauntletProps
): Promise<GauntletOutput> {
  const { userId, videoDataUri } = props;

  if (!userId) {
    throw new Error('User is not authenticated.');
  }

  // Step 1: Decrement user credits in a clean server context.
  // This happens BEFORE any AI processing.
  const userRef = adminDb.collection('users').doc(userId);
  try {
    await userRef.update({
      credits: FieldValue.increment(-1),
      total_runs: FieldValue.increment(1),
    });
  } catch (error) {
    console.error("Failed to decrement credits for user:", userId, error);
    // Re-throw a more user-friendly error
    throw new Error('Database error: Could not update user credits.');
  }
  
  // Step 2: Run the AI analysis flow.
  // The flow is now isolated and does not access the database.
  const analysisResult = await runGauntletFlow({ videoDataUri });

  // Optional Step 3: Update user's high score if the new score is higher.
  const newScore = analysisResult.survivability_score;
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  if (userData && newScore > (userData.high_score || 0)) {
     // This is a non-critical update, so we don't need to block on it
     // or fail the whole operation if it has an issue.
     userRef.update({ high_score: newScore }).catch(err => {
        console.warn("Could not update high score for user:", userId, err);
     });
  }


  // Step 4: Return the analysis result to the client.
  return analysisResult;
}
