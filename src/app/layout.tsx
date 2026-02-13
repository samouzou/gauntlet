import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/dashboard/header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/auth/auth-provider';

export const metadata: Metadata = {
  title: 'The Gauntlet',
  description: 'Test your video hooks against an army of 10,000 hyper-distracted Gen-Z scrollers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{colorScheme: "dark"}} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-mono antialiased')}>
        <FirebaseClientProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
              <footer className="py-6 border-t border-border/50">
                <div className="container mx-auto flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <p>The Gauntlet, a project by <a href="https://www.tryverza.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Verza Technologies, Inc.</a></p>
                  <div className="flex items-center gap-4">
                    <a href="https://www.tryverza.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy Policy</a>
                    <a href="https://www.tryverza.com/terms-of-service" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms of Service</a>
                  </div>
                </div>
              </footer>
            </div>
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
