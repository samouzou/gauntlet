'use client';

import { useUser, useFirebase, setDocumentNonBlocking } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user state is resolved
    }

    if (!user) {
        // If no user and not loading, auth is "ready" (we know there's no user)
        setIsAuthReady(true);
        return;
    }

    if (user && firestore) {
      const isEmailPasswordUser = user.providerData.some(p => p.providerId === 'password');
      
      // For email/password users, we only proceed if they are verified.
      // Other providers (like Google) are assumed to be verified.
      if (!isEmailPasswordUser || user.emailVerified) {
        const userRef = doc(firestore, 'users', user.uid);
        getDoc(userRef).then((docSnap) => {
          if (!docSnap.exists()) {
            // User is authenticated and verified, but no user document exists. Create one.
            const newUser = {
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
              total_runs: 0,
              high_score: 0,
              credits: 5, // Grant credits only when doc is created
            };
            setDocumentNonBlocking(userRef, newUser, { merge: true });
          }
          setIsAuthReady(true);
        }).catch(error => {
          console.error("Error checking for user document:", error);
          setIsAuthReady(true); // Proceed anyway to not block app
        });
      } else {
          // The user is an unverified email/password user.
          // The app is "ready" but the UI will redirect them.
          setIsAuthReady(true);
      }
    }
  }, [user, isUserLoading, firestore, router]);
  
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
