'use client';

import { useUser, useFirebase } from '@/firebase';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/app/actions/user-profile';

/**
 * Ensures every signed-in user has a Firestore profile + starter credits.
 * Writes go through Admin (server action) so client rules can't block signup.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const ensuredUid = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      ensuredUid.current = null;
      setIsAuthReady(true);
      return;
    }

    // Already ensured this uid in this session.
    if (ensuredUid.current === user.uid) {
      setIsAuthReady(true);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsAuthReady(false);
      try {
        await ensureUserProfile({
          userId: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
        });
        ensuredUid.current = user.uid;
      } catch (error) {
        console.error('Error ensuring user profile in Firestore:', error);
        // Still unblock the UI — spendCredit can seed on generate as a fallback.
      } finally {
        if (!cancelled) setIsAuthReady(true);
      }
    };

    // firestore presence means client Firebase is initialized; profile write is server-side.
    if (firestore || user) {
      void run();
    }

    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, firestore]);

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
