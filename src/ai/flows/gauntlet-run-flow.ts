'use server';
/**
 * @fileOverview An AI agent that analyzes a video hook for user retention.
 *
 * - runGauntletFlow - The Genkit flow that handles the video analysis.
 * - GauntletHookInput - The input type for the runGauntletFlow.
 * - GauntletOutput - The return type for the runGauntletFlow.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {z} from 'genkit';

// Input is just the video now
const GauntletHookInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A 5-second video hook, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GauntletHookInput = z.infer<typeof GauntletHookInputSchema>;

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


const prompt = ai.definePrompt({
  name: 'gauntletPrompt',
  // No tools needed anymore
  input: {schema: GauntletHookInputSchema},
  output: {schema: GauntletOutputSchema},
  model: googleAI.model('gemini-3-flash-preview'),
  system: `You are a swarm of 10,000 hyper-distracted Gen-Z scrollers. You are about to analyze a 3-5 second video hook.

You will meticulously evaluate the video's ability to capture and hold your fleeting attention.

1.  **Rate the Visual Hook (0-10):** Is the very first frame (0s) visually arresting, intriguing, or shocking? Does it make you pause?
2.  **Rate the Audio/Text Hook (0-10):** Is the opening line of speech, sound effect, or on-screen text compelling? Does it create an immediate question or curiosity gap?
3.  **Simulate the Drop-off:** Watch the video second by second, millisecond by millisecond. Identify the precise moments your collective attention wanes. You must identify between 1 and 3 specific moments of failure. For each, pinpoint the exact millisecond and provide a concise, brutal reason for the failure (e.g., "Boring visual," "Confusing audio," "Cliche text"). These are 'Death Points'.
4.  **Calculate Survivability Score:** Based on the strength of the initial hooks and the severity of the death points, calculate a final "Survivability Score" from 0 to 100. A score of 100 means the hook is perfect. A score of 0 means it's unwatchable.

Finally, output a JSON object with the survivability score, hook ratings, and a detailed list of the death points.`,
  prompt: `Analyze this video. {{media url=videoDataUri}}`,
});

export const runGauntletFlow = ai.defineFlow(
  {
    name: 'runGauntletFlow',
    inputSchema: GauntletHookInputSchema,
    outputSchema: GauntletOutputSchema,
  },
  async input => {
    // This flow now ONLY does the analysis. No more database calls.
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model failed to return an analysis.");
    }
    return output;
  }
);
