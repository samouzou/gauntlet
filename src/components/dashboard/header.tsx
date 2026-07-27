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
import { Briefcase } from 'lucide-react';

export function Header() {
  const { auth, user } = useFirebase();
  const { credits } = useUserCredits();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/70 px-4 backdrop-blur-md sm:px-6">
      <Link href="/" className="flex items-center gap-2.5 group">
        <Logo className="w-8 h-8 text-primary transition-transform duration-300 group-hover:scale-105" />
        <span className="font-display text-xl font-semibold tracking-tight hidden sm:inline-block">
          Outpost
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-1 ml-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Jobs</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/employer">Employers</Link>
        </Button>
      </nav>

      <div className="flex-1" />

      {user ? (
        <div className="flex items-center gap-3">
          <Link
            href="/employer"
            className="flex items-center gap-2 font-medium text-sm border border-border/80 bg-card/50 px-3 py-1.5 rounded-md hover:border-primary/40 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-primary" />
            <span>{credits ?? 0} posts</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                  <AvatarFallback>{user.displayName?.charAt(0) ?? user.email?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/employer')}>
                Employer dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Get started</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
