'use server';
/**
 * @fileOverview An AI agent that analyzes a video hook for user retention.
 *
 * - runGauntlet - A function that handles the video analysis process.
 * - GauntletInput - The input type for the runGauntlet function.
 * - GauntletOutput - The return type for the runGauntlet function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';
import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';


// Define tools
const decrementCreditsTool = ai.defineTool(
  {
    name: 'decrementUserCredits',
    description: 'Decrements the credit count for a given user.',
    inputSchema: z.object({userId: z.string()}),
    outputSchema: z.void(),
  },
  async ({userId}) => {
    const userRef = adminDb.collection('users').doc(userId);
    // If this database call fails, the error will propagate and the flow will fail.
    // This ensures credits are decremented before the user receives the result.
    await userRef.update({
      credits: FieldValue.increment(-1),
      total_runs: FieldValue.increment(1),
    });
  }
);

const GauntletInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A 5-second video hook, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userId: z.string().describe('The ID of the user submitting the video.'),
});
export type GauntletInput = z.infer<typeof GauntletInputSchema>;

const DeathPointSchema = z.object({
  timestamp: z
    .number()
    .describe('The exact millisecond in the video where attention failed.'),
  reason: z.string().describe('The specific reason attention was lost.'),
});

const GauntletOutputSchema = z.object({
  survivability_score: z
    .number()
    .describe('The overall survivability score from 0-100.'),
  visual_hook_score: z
    .number()
    .describe('The rating of the visual hook from 0-10.'),
  audio_hook_score: z
    .number()
    .describe('The rating of the audio/text hook from 0-10.'),
  death_points: z
    .array(DeathPointSchema)
    .describe("A list of 'Death Points' where attention failed."),
});
export type GauntletOutput = z.infer<typeof GauntletOutputSchema>;

export async function runGauntlet(
  input: GauntletInput
): Promise<GauntletOutput> {
  return runGauntletFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gauntletPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: {schema: GauntletInputSchema},
  output: {schema: GauntletOutputSchema},
  tools: [decrementCreditsTool],
  system: `You are a swarm of 10,000 hyper-distracted Gen-Z scrollers. You are about to analyze a 3-5 second video hook.

Your task is to meticulously evaluate the video's ability to capture and hold your fleeting attention.

1.  **Rate the Visual Hook (0-10):** Is the very first frame (0s) visually arresting, intriguing, or shocking? Does it make you pause?
2.  **Rate the Audio/Text Hook (0-10):** Is the opening line of speech, sound effect, or on-screen text compelling? Does it create an immediate question or curiosity gap?
3.  **Simulate the Drop-off:** Watch the video second by second, millisecond by millisecond. Identify the precise moments your collective attention wanes. You must identify between 1 and 3 specific moments of failure. For each, pinpoint the exact millisecond and provide a concise, brutal reason for the failure (e.g., "Boring visual," "Confusing audio," "Cliche text"). These are 'Death Points'.
4.  **Calculate Survivability Score:** Based on the strength of the initial hooks and the severity of the death points, calculate a final "Survivability Score" from 0 to 100. A score of 100 means the hook is perfect. A score of 0 means it's unwatchable.

After analysis, you MUST call the 'decrementUserCredits' tool with the provided 'userId' to charge for this analysis.

Finally, output a JSON object with the survivability score, hook ratings, and a detailed list of the death points.`,
  prompt: `Analyze this video: {{media url=videoDataUri}}`,
});

const runGauntletFlow = ai.defineFlow(
  {
    name: 'runGauntletFlow',
    inputSchema: GauntletInputSchema,
    outputSchema: GauntletOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
