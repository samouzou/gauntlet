'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

export function EmailPasswordForm() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mode, setMode] = React.useState<'signIn' | 'signUp'>('signIn');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmailAndPassword(auth, values.email, values.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        if (userCredential.user) {
          await sendEmailVerification(userCredential.user);
          toast({
            title: "Verification Email Sent",
            description: "Please check your inbox to finish signing up.",
          });
        }
      }
      // The onAuthStateChanged listener in AuthProvider will handle the redirect on success.
    } catch (error: any) {
      // Firebase provides specific error codes.
      let errorMessage = "An unexpected error occurred. Please try again.";
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          errorMessage = "Invalid email or password.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists.";
          break;
        case "auth/weak-password":
          errorMessage = "The password is too weak. Please use at least 6 characters.";
          break;
        case "auth/invalid-email":
            errorMessage = "Please enter a valid email address.";
            break;
        default:
          console.error("Authentication Error:", error);
          break;
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
    form.clearErrors();
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm">
        {mode === 'signIn' ? (
          <>
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={toggleMode}>
              Sign up
            </Button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={toggleMode}>
              Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
