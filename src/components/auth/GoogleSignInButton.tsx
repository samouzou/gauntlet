"use client";
import { initiateGoogleSignIn, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function GoogleSignInButton() {
    const { auth } = useFirebase();
    const { toast } = useToast();

    const handleSignIn = async () => {
        try {
            initiateGoogleSignIn(auth);
        } catch (error) {
            console.error("Google Sign-In Error", error);
            toast({
                variant: "destructive",
                title: "Sign-In Failed",
                description: "Could not sign in with Google. Please try again.",
            });
        }
    };

    return (
        <Button onClick={handleSignIn} className="w-full">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 381.7 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 102.3 282.7 92 248 92c-71 0-129.2 57.6-129.2 128.3s58.2 128.3 129.2 128.3c76.2 0 116.8-52.4 121.3-78.7H248v-95.6h236.3c-4.3 22.7-24.8 89.4-90.1 138.6z"></path>
            </svg>
            Sign in with Google
        </Button>
    );
}
