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
    <div className="grid md:grid-cols-2 gap-12 items-center min-h-[90vh] py-12 animate-in fade-in-50 duration-500">
        <div className="flex flex-col items-start text-left">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter mb-4 text-primary">Your Hooks vs. 10,000 Scrollers.</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                The Gauntlet is a simulator that stress-tests your video hooks against a swarm of hyper-distracted Gen-Z agents. Get an instant survivability score, pinpoint exact moments of failure, and find your next viral hit before you even post.
            </p>
            <ul className="space-y-4 text-foreground">
                <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary"/>
                    <span>Instant survivability score (0-100%).</span>
                </li>
                <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary"/>
                    <span>Pinpoint "Death Points" where attention fails.</span>
                </li>
                <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary"/>
                    <span>Rate your visual and audio hooks independently.</span>
                </li>
            </ul>
        </div>
        <div>
            <Card className="w-full max-w-sm mx-auto">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <Logo className="w-16 h-16 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Get Started</CardTitle>
                    <CardDescription>
                        Create an account or sign in to get 5 free credits.
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
    </div>
  );
}
