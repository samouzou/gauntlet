'use client';
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';

export function useUserCredits() {
    const { user, firestore } = useFirebase();

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userData, isLoading } = useDoc<{ credits: number }>(userDocRef);

    return { credits: userData?.credits, isLoading };
}
