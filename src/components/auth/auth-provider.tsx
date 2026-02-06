'use client';

import { useUser, useFirebase, initiateAnonymousSignIn, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const [isOrgLoading, setIsOrgLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (user && firestore) {
      const orgsRef = collection(firestore, 'organizations');
      const q = query(orgsRef, where(`members.${user.uid}`, 'in', ['admin', 'member']));
      
      getDocs(q).then((snapshot) => {
        if (snapshot.empty) {
          // No org found, create one.
          const newOrgRef = doc(collection(firestore, 'organizations'));
          const newOrg = {
            name: 'My New SaaS',
            industry: 'Software',
            createdAt: serverTimestamp(),
            members: {
              [user.uid]: 'admin',
            },
          };
          setDocumentNonBlocking(newOrgRef, newOrg, {});

          // Add sample data
          const subsCollection = collection(firestore, 'organizations', newOrgRef.id, 'subscriptions');
          addDocumentNonBlocking(subsCollection, {
              planName: 'Basic',
              startDate: subMonths(new Date(), 6).toISOString(),
              mrr: 49,
              churnProbability: 0.05
          });
          addDocumentNonBlocking(subsCollection, {
              planName: 'Pro',
              startDate: subMonths(new Date(), 2).toISOString(),
              mrr: 99,
              churnProbability: 0.02
          });

          const purchasesCollection = collection(firestore, 'organizations', newOrgRef.id, 'oneTimePurchases');
          addDocumentNonBlocking(purchasesCollection, {
              description: 'Setup Fee',
              amount: 500,
              purchaseDate: subMonths(new Date(), 6).toISOString()
          });
        }
        setIsOrgLoading(false);
      });
    } else if (!isUserLoading) {
      setIsOrgLoading(false);
    }
  }, [user, isUserLoading, firestore]);
  
  if (isUserLoading || isOrgLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Setting things up...</p>
            </div>
        </div>
      )
  }

  return <>{children}</>;
}
