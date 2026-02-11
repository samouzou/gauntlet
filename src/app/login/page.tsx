'use client';
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
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
    <div className="flex items-center justify-center h-[90vh] py-12">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Logo className="w-16 h-16 text-primary" />
                </div>
                <CardTitle className="text-2xl">The Gauntlet</CardTitle>
                <CardDescription>
                    Sign in to run The Gauntlet.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <EmailPasswordForm />
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                        Or
                        </span>
                    </div>
                </div>
                <GoogleSignInButton />
            </CardContent>
        </Card>
    </div>
  );
}
