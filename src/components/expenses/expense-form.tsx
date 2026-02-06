"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2 } from 'lucide-react';

import { getExpenseBudgetRecommendations, type ExpenseInput } from '@/ai/flows/expense-budget-recommendations';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  operationalExpenses: z.coerce.number().min(0, "Operational expenses must be positive."),
  marketingExpenses: z.coerce.number().min(0, "Marketing expenses must be positive."),
  revenue: z.coerce.number().min(0, "Revenue must be positive."),
  otherContext: z.string().optional(),
});

export function ExpenseForm() {
  const [recommendations, setRecommendations] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operationalExpenses: undefined,
      marketingExpenses: undefined,
      revenue: undefined,
      otherContext: '',
    },
  });

  async function onSubmit(values: ExpenseInput) {
    setIsLoading(true);
    setRecommendations('');
    try {
      const result = await getExpenseBudgetRecommendations(values);
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get recommendations. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Expense Management</CardTitle>
              <CardDescription>
                Input your expenses to get AI-powered budget recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Revenue ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="operationalExpenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operational Expenses ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketingExpenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketing Expenses ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 10000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Context (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., We are planning a new product launch next quarter."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Get Recommendations
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card className="sticky top-20">
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>
            Suggestions to optimize your budget for better profitability.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] text-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations ? (
            <p className="whitespace-pre-wrap">{recommendations}</p>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <p>Your budget recommendations will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
