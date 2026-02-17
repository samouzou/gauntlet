import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/dashboard/header';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/components/auth/auth-provider';

const title = 'The Gauntlet by Verza';
const description = 'Stress-test your video hooks against 10,000 hyper-distracted AI agents. Get an instant survivability score and find your next viral hit before you post.';
const url = 'https://gauntlet.tryverza.com';


export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description: description,
  keywords: ['video hook analysis', 'virality score', 'social media marketing', 'gen-z attention', 'creator tools', 'tiktok', 'instagram reels'],
  openGraph: {
    title: title,
    description: description,
    url: url,
    siteName: title,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: title,
      url: url,
      description: description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any', // Indicates it's a web application accessible on any OS
      offers: {
        '@type': 'Offer',
        price: '0', // The initial offering of free credits is free
        priceCurrency: 'USD',
      },
  };
  
  return (
    <html lang="en" className="dark" style={{colorScheme: "dark"}} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Google Analytics */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-N3YM7748XD"
        />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-N3YM7748XD');
          `}
        </Script>
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
