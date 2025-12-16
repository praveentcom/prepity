import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from '@/components/ui/toaster';
import Head from 'next/head';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { RequestsProvider } from '@/lib/client/contexts/requests-context';

function PrepityApp({ Component, pageProps }: AppProps) {
  const { initialRequests = [] } = pageProps;
  
  return (
    <>
      <Head>
        <title>Prepity | AI-Powered MCQ Questions Generator</title>
      </Head>
      <main className={GeistSans.className}>
        <RequestsProvider initialRequests={initialRequests}>
          <AuthenticatedLayout>
            <Component {...pageProps} />
          </AuthenticatedLayout>
        </RequestsProvider>
        <Toaster />
      </main>
    </>
  );
}

export default PrepityApp;
