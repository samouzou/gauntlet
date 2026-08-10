'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import Link from 'next/link';

export function AuthGateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Save your place</DialogTitle>
          <DialogDescription>
            Create a free account to bring this scene to life — and keep every reel you make.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">Open full login page</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
