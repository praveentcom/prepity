import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { GeistSans } from "geist/font/sans";
import { Toaster } from '@/components/ui/toaster';

function PrepityApp({ Component, pageProps }: AppProps) {
    return <main className={GeistSans.className}>
        <Component {...pageProps} />
        <Toaster />
    </main>;
}

export default PrepityApp;
