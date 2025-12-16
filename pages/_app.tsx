import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from '@/components/ui/toaster';
import Head from 'next/head';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';

function PrepityApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Prepity | AI-Powered MCQ Questions Generator</title>
      </Head>
      <main className={GeistSans.className}>
        <AuthenticatedLayout>
          <Component {...pageProps} />
        </AuthenticatedLayout>
        <Toaster />
      </main>
    </>
  );
}

export default PrepityApp;
