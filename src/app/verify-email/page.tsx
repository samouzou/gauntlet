'use client';

import { useUser, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function VerifyEmailPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Redirect logic:
    // If not loading and no user, go to login.
    // If user is loaded and verified, go to the main app.
    // Otherwise, stay on this page.
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.emailVerified) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    // This adds a listener that will auto-reload the user
    // state when the user comes back to the page after verification.
    // The `onAuthStateChanged` in the provider will handle the update.
    if (auth) {
        const unsubscribe = auth.onIdTokenChanged(async (user) => {
            if (user) {
                await user.reload();
                if (user.emailVerified) {
                    router.push('/');
                }
            }
        });
        return () => unsubscribe();
    }
  }, [auth, router]);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification link has been sent to your email address.',
      });
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send verification email. Please try again later.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = () => {
      signOut(auth).then(() => {
          router.push('/login');
      });
  };

  // While loading, or if redirecting, show a spinner.
  if (isUserLoading || !user || (user && user.emailVerified)) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking verification status...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center h-[90vh] py-12">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Logo className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-2xl">Check Your Inbox</CardTitle>
                <CardDescription>
                    We sent a verification link to <span className="font-bold text-foreground">{user.email}</span>. Click the link to finish signing up.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleResendVerification} disabled={isSending} className="w-full">
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend Verification Email
                </Button>
                <Button onClick={handleSignOut} variant="secondary" className="w-full">
                    Use a Different Email
                </Button>
                <p className="text-xs text-center text-muted-foreground pt-4">
                    Once you've verified, you'll be redirected automatically.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
