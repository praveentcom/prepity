import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Google_Sans_Flex, Google_Sans_Code } from 'next/font/google';
import { Toaster } from '@workspace/ui/components/sonner';
import Head from 'next/head';
import { ClientLayout } from '@/components/layout/client-layout';
import { RequestsProvider } from '@/lib/client/contexts/requests-context';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import Script from 'next/script';

const fontSans = Google_Sans_Flex({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: false,
});

const fontMono = Google_Sans_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  adjustFontFallback: false,
});

/**
 * PrepityApp is the main component for the Prepity application.
 * It is the entry point for the application and contains the main layout and the main content.
 * @param Component - The component to render
 * @param pageProps - The page props
 * @returns The main component for the Prepity application
 */
function PrepityApp({ Component, pageProps }: AppProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <Head>
        <title>Prepity | AI-powered MCQ Generator</title>
      </Head>
      <main
        className={`${fontSans.variable} ${fontMono.variable} ${fontSans.className}`}
      >
        <RequestsProvider>
          <ClientLayout>
            <Component {...pageProps} />
          </ClientLayout>
        </RequestsProvider>
        <Toaster />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-ZWWNB7WYKX`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZWWNB7WYKX');
          `}
        </Script>
      </main>
    </NextThemesProvider>
  );
}

export default PrepityApp;
