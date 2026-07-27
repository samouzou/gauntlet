import type { Metadata } from 'next';
import Script from 'next/script';
import { Outfit, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/dashboard/header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/auth/auth-provider';

const display = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const title = 'Outpost';
const description =
  'Remote-only job search. Browse curated worldwide roles for free, or post openings as an employer.';
const url = process.env.NEXT_PUBLIC_APP_URL || 'https://outpost.tryverza.com';

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  keywords: ['remote jobs', 'remote work', 'job board', 'work from anywhere', 'hiring'],
  openGraph: {
    title,
    description,
    url,
    siteName: title,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-N3YM7748XD" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N3YM7748XD');
          `}
        </Script>
      </head>
      <body className={cn(display.variable, sans.variable, 'font-sans antialiased')}>
        <FirebaseClientProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
              <footer className="py-8 border-t border-border/50 mt-auto">
                <div className="container mx-auto flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <p className="font-display text-foreground/80">Outpost — remote work, found.</p>
                  <p>
                    Aggregated listings may include jobs from{' '}
                    <a
                      href="https://remotive.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Remotive
                    </a>
                    . Always apply on the original posting.
                  </p>
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
