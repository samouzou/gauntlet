"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wand2 } from 'lucide-react';

import { predictCustomerChurn, type PredictCustomerChurnOutput } from '@/ai/flows/predict-customer-churn';
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
  historicalCustomerData: z.string().min(50, "Please provide substantial historical data."),
  targetChurnRate: z.coerce.number().min(0).max(100),
});

const placeholderData = `customerID,subscription_months,monthly_spend,support_tickets,churned
1,12,50,2,0
2,3,75,8,1
3,24,100,1,0
4,6,30,5,1
5,18,60,0,0
`;

export function ChurnForm() {
  const [prediction, setPrediction] = useState<PredictCustomerChurnOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      historicalCustomerData: '',
      targetChurnRate: 5,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPrediction(null);
    try {
      const result = await predictCustomerChurn(values);
      setPrediction(result);
    } catch (error) {
      console.error('Error getting churn prediction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get churn prediction. Please try again.',
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
              <CardTitle>Churn Prediction</CardTitle>
              <CardDescription>
                Paste historical customer data (CSV) to predict churn and get reduction strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="historicalCustomerData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Customer Data (CSV)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={placeholderData}
                        className="h-64 font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetChurnRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Churn Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    Predict Churn
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <div className="space-y-8 sticky top-20">
        {isLoading ? (
            <Card className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        ) : prediction ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Prediction Results</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Predicted Churn Rate</p>
                    <p className="text-3xl font-bold text-primary">{prediction.predictedChurnRate.toFixed(2)}%</p>
                </div>
                <div className="p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Key Churn Factors</p>
                    <p className="text-sm font-medium">{prediction.keyChurnFactors}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reduction Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{prediction.recommendations}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Your churn prediction and recommendations will appear here.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
