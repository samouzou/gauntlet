'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useUser, useCollection, useMemoFirebase } from '@/firebase';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Product } from '@/lib/types';


export default function GauntletPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const router = useRouter();
  const { toast } = useToast();

  const [gauntletState, setGauntletState] = useState<GauntletState>('idle');
  const [result, setResult] = useState<GauntletOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('credit_amount', 'asc'));
  }, [firestore]);

  const { data: creditPacks, isLoading: productsLoading } = useCollection<Product>(productsQuery);

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

  const handlePurchase = async (priceId: string) => {
    if (!user) return;
    setIsBuying(priceId);
    try {
      await createCheckoutSession({ userId: user.uid, priceId });
    } catch (error) {
      console.error("Checkout failed", error);
      toast({
        variant: "destructive",
        title: "Checkout Error",
        description: "Could not initiate the purchase. Please try again."
      })
    } finally {
      setIsBuying(null);
    }
  };

  const handleReset = () => {
    setGauntletState('idle');
    setResult(null);
    setError(null);
  };
  
  if (creditsLoading || productsLoading) {
      return (
        <div className="flex h-[80vh] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  if (credits === 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full text-center p-4">
            <Card className="w-full max-w-lg mb-8">
                <CardHeader>
                    <CardTitle>You're out of credits!</CardTitle>
                    <CardDescription>Purchase a credit pack to continue running The Gauntlet.</CardDescription>
                </CardHeader>
            </Card>
            <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {creditPacks && creditPacks.map((pack) => (
                    <Card key={pack.stripe_price_id} className={cn("flex flex-col", (pack.display_tag === 'Most Popular' || pack.display_tag === 'Best Value') && "border-primary shadow-lg shadow-primary/10")}>
                        {pack.display_tag && (
                            <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">{pack.display_tag}</Badge>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle>{pack.name}</CardTitle>
                            <CardDescription>{pack.credit_amount} Credits</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-center items-center">
                           <p className="text-4xl font-bold mb-4">${pack.price_usd}</p>
                           <form action={() => handlePurchase(pack.stripe_price_id)} className="w-full">
                                <Button 
                                    type="submit" 
                                    className="w-full"
                                    variant={(pack.display_tag === 'Most Popular' || pack.display_tag === 'Best Value') ? 'default' : 'secondary'}
                                    disabled={isBuying === pack.stripe_price_id}
                                >
                                    {isBuying === pack.stripe_price_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Buy Now
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ))}
            </div>
             {creditPacks?.length === 0 && (
                <p className="text-muted-foreground">No credit packs are available for purchase right now. Please check back later.</p>
            )}
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
