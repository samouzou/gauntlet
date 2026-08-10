'use client';

import { useUser, useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { consumeVerificationEmailPending } from '@/lib/auth/verification';
import { ensureUserProfile } from '@/app/actions/user-profile';

export default function VerifyEmailPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const autoSendTried = useRef(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.emailVerified) {
        router.replace('/studio');
      }
    }
  }, [user, isUserLoading, router]);

  // If signup was interrupted before sendEmailVerification finished, retry once.
  useEffect(() => {
    if (!user || user.emailVerified || autoSendTried.current) return;
    const pending = consumeVerificationEmailPending();
    if (!pending) return;

    autoSendTried.current = true;
    setIsSending(true);
    (async () => {
      try {
        await sendEmailVerification(user);
        await ensureUserProfile({
          userId: user.uid,
          email: user.email ?? pending.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }).catch(() => undefined);
        toast({
          title: 'Verification email sent',
          description: 'Check your inbox (and spam) for the confirmation link.',
        });
      } catch (error: any) {
        console.error('Auto verification send failed', error);
        if (error?.code !== 'auth/too-many-requests') {
          toast({
            variant: 'destructive',
            title: 'Couldn’t send email automatically',
            description: 'Tap Resend below to try again.',
          });
        }
      } finally {
        setIsSending(false);
      }
    })();
  }, [user, toast]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onIdTokenChanged(async (nextUser) => {
      if (!nextUser) return;
      await nextUser.reload();
      if (nextUser.emailVerified) {
        window.location.assign('/studio');
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleResendVerification = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Verification email sent',
        description: 'A new verification link has been sent to your email address.',
      });
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error?.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait a minute and try again.'
            : 'Failed to send verification email. Please try again later.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = () => {
    if (!auth) return;
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  if (isUserLoading || !user || user.emailVerified) {
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
            We sent a verification link to{' '}
            <span className="font-bold text-foreground">{user.email}</span>. Click the link to
            finish signing up.
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
            Once you&apos;ve verified, you&apos;ll be redirected automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
