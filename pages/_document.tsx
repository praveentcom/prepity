import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="AI-powered MCQ generator for exam and interview preparation built with AI SDK, Next.js and PostgreSQL."
        />
        <meta
          property="og:title"
          content="Prepity | AI-powered MCQ Generator"
        />
        <meta
          property="og:description"
          content="AI-powered MCQ generator for exam and interview preparation built with AI SDK, Next.js and PostgreSQL."
        />
        <meta property="og:image" content="/cover-image.png" />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@praveentcom" />
        <meta
          name="twitter:title"
          content="Prepity | AI-powered MCQ Generator"
        />
        <meta
          name="twitter:description"
          content="AI-powered MCQ generator for exam and interview preparation built with AI SDK, Next.js and PostgreSQL."
        />
        <meta name="twitter:image" content="/cover-image.png" />
        <meta name="apple-mobile-web-app-title" content="Prepity" />
      </Head>
      <body className="bg-muted font-sans antialiased min-h-screen flex flex-col max-w-full overflow-x-hidden">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
