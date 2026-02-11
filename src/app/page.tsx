'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useUser } from '@/firebase';
import { runGauntlet } from '@/app/actions/gauntlet-actions';
import { type GauntletOutput } from '@/ai/flows/gauntlet-run-flow';
import { useToast } from '@/hooks/use-toast';

import { UploadZone } from '@/components/gauntlet/UploadZone';
import { SimulationView } from '@/components/gauntlet/SimulationView';
import { ResultScreen } from '@/components/gauntlet/ResultScreen';
import { useUserCredits } from '@/hooks/use-user-credits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/app/actions/checkout';
import { RunHistory } from '@/components/dashboard/RunHistory';

type GauntletState = 'idle' | 'processing' | 'success' | 'error';

export default function GauntletPage() {
  const { user, isUserLoading } = useUser();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const router = useRouter();
  const { toast } = useToast();

  const [gauntletState, setGauntletState] = useState<GauntletState>('idle');
  const [result, setResult] = useState<GauntletOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isUserLoading) {
    return <div className="text-center p-12">Loading user...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleFileUpload = async (file: File) => {
    if (credits === 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Credits',
        description: 'Please purchase more credits to run the gauntlet.',
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a video under 10MB.',
      });
      return
    }

    setGauntletState('processing');
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const videoDataUri = reader.result as string;
        // Pass the filename along with the data URI and user ID
        const gauntletResult = await runGauntlet({ 
          videoDataUri, 
          userId: user.uid,
          videoFilename: file.name
        });
        setResult(gauntletResult);
        setGauntletState('success');
      };
      reader.onerror = (error) => {
        throw new Error('Failed to read file.');
      }

    } catch (e: any) {
      console.error('Gauntlet run failed:', e);
      const errorMessage = e.message || 'An unknown error occurred.';
      setError(errorMessage);
      setGauntletState('error');
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: errorMessage,
      });
    }
  };

  const handleReset = () => {
    setGauntletState('idle');
    setResult(null);
    setError(null);
  };
  
  if (creditsLoading) {
      return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  if (credits === 0) {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>You're out of credits!</CardTitle>
                    <CardDescription>Purchase more credits to continue running the Gauntlet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={async () => {
                      if (!user) return;
                      await createCheckoutSession({ userId: user.uid });
                    }}>
                      <Button type="submit">Buy 5 Credits for $1.99</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {gauntletState === 'idle' && <UploadZone onFileUpload={handleFileUpload} />}
      {gauntletState === 'processing' && <SimulationView />}
      {gauntletState === 'success' && result && (
        <ResultScreen result={result} onReset={handleReset} />
      )}
      {gauntletState === 'error' && (
        <div className="text-center p-8 bg-card rounded-lg">
          <h2 className="text-2xl font-bold text-destructive mb-4">Simulation Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleReset} variant="secondary">Try Again</Button>
        </div>
      )}
      
      {/* Show history when not processing */}
      {gauntletState !== 'processing' && <RunHistory />}
    </div>
  );
}
