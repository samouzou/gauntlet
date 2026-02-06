// expense-budget-recommendations.ts
'use server';

/**
 * @fileOverview Provides AI-driven recommendations on budget adjustments for improved profitability based on inputted operational and marketing expenses.
 *
 * - getExpenseBudgetRecommendations - A function that takes in expense data and returns budget adjustment recommendations.
 * - ExpenseInput - The input type for the getExpenseBudgetRecommendations function.
 * - ExpenseOutput - The return type for the getExpenseBudgetRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseInputSchema = z.object({
  operationalExpenses: z.number().describe('Total operational expenses.'),
  marketingExpenses: z.number().describe('Total marketing expenses.'),
  revenue: z.number().describe('Total revenue.'),
  otherContext: z.string().optional().describe('Any other context to provide to the model.'),
});

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>;

const ExpenseOutputSchema = z.object({
  recommendations: z.string().describe('AI-driven recommendations on budget adjustments.'),
});

export type ExpenseOutput = z.infer<typeof ExpenseOutputSchema>;

export async function getExpenseBudgetRecommendations(
  input: ExpenseInput
): Promise<ExpenseOutput> {
  return expenseBudgetRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expenseBudgetRecommendationsPrompt',
  input: {schema: ExpenseInputSchema},
  output: {schema: ExpenseOutputSchema},
  prompt: `You are a financial analyst providing recommendations on budget adjustments.

  Based on the following financial data, provide AI-driven recommendations on areas of the budget to adjust for improved profitability.

  Revenue: {{{revenue}}}
  Operational Expenses: {{{operationalExpenses}}}
  Marketing Expenses: {{{marketingExpenses}}}
  Other Context: {{{otherContext}}}
  `,
});

const expenseBudgetRecommendationsFlow = ai.defineFlow(
  {
    name: 'expenseBudgetRecommendationsFlow',
    inputSchema: ExpenseInputSchema,
    outputSchema: ExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
