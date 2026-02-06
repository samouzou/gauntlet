"use client";

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useUserCredits } from '@/hooks/use-user-credits';
import { Flame } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { auth, user, firestore } = useFirebase();
  const { credits } = useUserCredits();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleSignOut = () => {
    signOut(auth);
    router.push('/login');
  };

  const handleAddCredits = async () => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    // This is the temporary "add credits" logic.
    await setDocumentNonBlocking(userRef, { credits: increment(5) }, { merge: true });
    toast({
        title: "Credits Added",
        description: "5 credits have been added to your account.",
    })
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="w-8 h-8 text-primary" />
        <span className="font-semibold text-lg hidden sm:inline-block">The Gauntlet</span>
      </Link>
      
      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleAddCredits}>Add 5 Credits (Test)</Button>
            <div className="flex items-center gap-2 font-mono text-sm border px-3 py-1.5 rounded-md">
              <Flame className="w-4 h-4 text-primary" />
              <span>{credits ?? '...'} Credits</span>
            </div>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                 <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                  <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}
