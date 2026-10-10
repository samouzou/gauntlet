'use client';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const isUnverifiedPasswordUser =
    !!user &&
    !user.emailVerified &&
    user.providerData.some((p) => p.providerId === 'password');

  useEffect(() => {
    if (isUserLoading || !user) return;
    // Keep the form mounted for unverified password users so signup can finish
    // sending the verification email without a redirect race.
    if (isUnverifiedPasswordUser) return;
    router.replace('/studio');
  }, [user, isUserLoading, router, isUnverifiedPasswordUser]);

  // Only block the UI while loading, or while redirecting verified/Google users.
  if (isUserLoading || (user && !isUnverifiedPasswordUser)) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center min-h-[80vh] py-12 animate-fade-up">
      <div className="flex flex-col items-start text-left">
        <p className="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-primary mb-4">
          Reelwright
        </p>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight mb-4">
          Come make something.
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl">
          Wander the cast and scenes freely. Sign in when you want to shoot — then keep shaping the
          story in your own words.
        </p>
        <ul className="space-y-4 text-foreground">
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Characters that look like themselves from scene to scene.</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Edit by talking — rain heavier, camera closer, mood darker.</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Your reels stay here, ready for the next cut.</span>
          </li>
        </ul>
      </div>
      <div>
        <Card className="w-full max-w-sm mx-auto border-border/70 bg-card/60">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="w-14 h-14 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Welcome</CardTitle>
            <CardDescription>
              {isUnverifiedPasswordUser
                ? 'Almost there — check your email to finish signing up.'
                : 'Create an account to start shooting.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <EmailPasswordForm />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <GoogleSignInButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
