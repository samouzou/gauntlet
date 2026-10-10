'use client';

import { useUser, useFirebase } from '@/firebase';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ensureUserProfile } from '@/app/actions/user-profile';

/**
 * Ensures every signed-in user has a Firestore profile + starter credits.
 * Writes go through Admin (server action) so client rules can't block signup.
 *
 * Important: once the initial auth check finishes, we never unmount children
 * again while ensuring a profile — that was racing email signup and cancelling
 * sendEmailVerification mid-flight.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [initialReady, setInitialReady] = useState(false);
  const ensuredUid = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    // First auth resolution — unblock the tree.
    if (!initialReady) {
      setInitialReady(true);
    }

    if (!user) {
      ensuredUid.current = null;
      return;
    }

    if (ensuredUid.current === user.uid) return;

    let cancelled = false;

    const run = async () => {
      try {
        await ensureUserProfile({
          userId: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
        });
        if (!cancelled) ensuredUid.current = user.uid;
      } catch (error) {
        console.error('Error ensuring user profile in Firestore:', error);
      }
    };

    if (firestore || user) {
      void run();
    }

    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, firestore, initialReady]);

  if (isUserLoading || !initialReady) {
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
