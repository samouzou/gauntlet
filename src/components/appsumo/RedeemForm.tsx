'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { useUserCredits } from '@/hooks/use-user-credits';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';

export function RedeemForm() {
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const { unlimited } = useUserCredits();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!user || !code.trim()) return;
    setIsRedeeming(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/appsumo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) {
        setError(result.error || 'We couldn’t redeem that code.');
        return;
      }
      setRedeemed(true);
    } catch {
      setError('We couldn’t redeem that code. Try again in a moment.');
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 animate-fade-up">
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Redeem your AppSumo code</CardTitle>
          <CardDescription>
            Lifetime access to Reelwright with unlimited scenes, edits and stills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {redeemed || unlimited ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">
                {redeemed
                  ? 'Your lifetime access is active.'
                  : 'This account already has lifetime access.'}
              </p>
              <Button asChild className="w-full">
                <Link href="/studio">Open studio</Link>
              </Button>
            </div>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Create an account or sign in first, then enter your code.
              </p>
              <EmailPasswordForm redirectTo={null} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <GoogleSignInButton />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="appsumo-code">AppSumo code</Label>
                <Input
                  id="appsumo-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="RW-XXXXXXXXXX-XXXXXXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                className="w-full"
                disabled={isRedeeming || !code.trim()}
                onClick={handleRedeem}
              >
                {isRedeeming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Redeem code
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Signed in as {user.email}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
