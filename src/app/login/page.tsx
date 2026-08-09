'use client';
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import { CheckCircle } from "lucide-react";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/studio');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
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
          Generate when you&apos;re ready.
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl">
          Browse sample characters and scenes without an account. Sign in to spend credits on Gemini Omni generations and conversational edits.
        </p>
        <ul className="space-y-4 text-foreground">
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Character references that stay consistent across scenes.</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Continue and edit reels through conversation.</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span>Credits only when you actually generate.</span>
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
              Create an account to unlock generation credits.
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
