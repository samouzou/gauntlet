'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { ensureUserProfile } from '@/app/actions/user-profile';
import { markVerificationEmailPending } from '@/lib/auth/verification';
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

async function sendVerificationSafely(user: User) {
  if (user.emailVerified) return;
  await sendEmailVerification(user);
}

export function EmailPasswordForm() {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
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
        const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
        // Profile write in background — don't block navigation.
        void ensureUserProfile({
          userId: credential.user.uid,
          email: credential.user.email ?? values.email,
          displayName: credential.user.displayName,
          photoURL: credential.user.photoURL,
        }).catch((err) => console.error('ensureUserProfile failed', err));

        if (!credential.user.emailVerified) {
          markVerificationEmailPending(values.email);
          router.replace('/verify-email');
          return;
        }
        router.replace('/studio');
        return;
      }

      // --- Sign up ---
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // 1) Send verification FIRST — before profile writes / navigation races.
      //    AuthProvider + /login used to redirect as soon as Auth user existed,
      //    which interrupted this step; resend on /verify-email then "worked".
      try {
        await sendVerificationSafely(user);
        markVerificationEmailPending(values.email);
      } catch (verifyError: any) {
        console.error('sendEmailVerification failed on signup', verifyError);
        // Still mark pending so /verify-email can retry automatically.
        markVerificationEmailPending(values.email);
        toast({
          variant: 'destructive',
          title: 'Couldn’t send verification email',
          description:
            verifyError?.code === 'auth/too-many-requests'
              ? 'Too many attempts. Wait a minute, then use Resend on the next screen.'
              : 'Account created — use Resend on the next screen if you don’t see the email.',
        });
      }

      // 2) Firestore profile (Admin) — must not block the verification email.
      try {
        await ensureUserProfile({
          userId: user.uid,
          email: user.email ?? values.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } catch (profileError) {
        console.error('ensureUserProfile failed on signup', profileError);
        // AuthProvider will retry; spendCredit can also seed.
      }

      toast({
        title: 'Check your inbox',
        description: 'We sent a verification link. Confirm your email to finish signing up.',
      });
      router.replace('/verify-email');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists. Sign in instead.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          console.error('Authentication Error:', error);
          if (error?.message) errorMessage = error.message;
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
            Don&apos;t have an account?{' '}
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
