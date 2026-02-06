'use server';

/**
 * @fileOverview Predicts customer churn rate and provides insights on how to reduce churn.
 *
 * - predictCustomerChurn - A function that handles the customer churn prediction process.
 * - PredictCustomerChurnInput - The input type for the predictCustomerChurn function.
 * - PredictCustomerChurnOutput - The return type for the predictCustomerChurn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictCustomerChurnInputSchema = z.object({
  historicalCustomerData: z
    .string()
    .describe(
      'Historical customer data in CSV format, including features like subscription duration, usage metrics, support tickets, and churn status.'
    ),
  targetChurnRate: z.number().describe('The target churn rate to achieve.'),
});
export type PredictCustomerChurnInput = z.infer<typeof PredictCustomerChurnInputSchema>;

const PredictCustomerChurnOutputSchema = z.object({
  predictedChurnRate: z
    .number()
    .describe('The predicted churn rate based on the historical data.'),
  keyChurnFactors: z
    .string()
    .describe(
      'A summary of the key factors contributing to customer churn, based on the historical data.'
    ),
  recommendations: z
    .string()
    .describe(
      'Specific, actionable recommendations for reducing customer churn, tailored to the identified key factors.'
    ),
});
export type PredictCustomerChurnOutput = z.infer<typeof PredictCustomerChurnOutputSchema>;

export async function predictCustomerChurn(
  input: PredictCustomerChurnInput
): Promise<PredictCustomerChurnOutput> {
  return predictCustomerChurnFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictCustomerChurnPrompt',
  input: {schema: PredictCustomerChurnInputSchema},
  output: {schema: PredictCustomerChurnOutputSchema},
  prompt: `You are an expert financial analyst specializing in SaaS business metrics. Given the following historical customer data, predict the customer churn rate and provide insights on how to reduce churn.

Historical Customer Data (CSV format):
{{{historicalCustomerData}}}

Target Churn Rate: {{{targetChurnRate}}}

Instructions:
1. Analyze the historical customer data to identify key factors contributing to customer churn.
2. Predict the churn rate based on the provided data.
3. Provide specific, actionable recommendations for reducing customer churn, tailored to the identified key factors.

Output in the following JSON format:
{
  "predictedChurnRate": number,
  "keyChurnFactors": string,  // Summary of the key factors contributing to churn
  "recommendations": string   // Actionable recommendations to reduce churn
}
`,
});

const predictCustomerChurnFlow = ai.defineFlow(
  {
    name: 'predictCustomerChurnFlow',
    inputSchema: PredictCustomerChurnInputSchema,
    outputSchema: PredictCustomerChurnOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
