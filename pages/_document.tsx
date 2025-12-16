import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="Prepity helps to generate MCQ questions for exams, interviews and for fun with the help of AI. It can create any kind of questions with ease and in seconds."
        />
        <meta
          property="og:title"
          content="Prepity | AI-Powered MCQ Questions Generator"
        />
        <meta
          property="og:description"
          content="Prepity helps to generate MCQ questions for exams, interviews and for fun with the help of AI. It can create any kind of questions with ease and in seconds."
        />
        <meta
          property="og:image"
          content={`${process.env.NEXT_PUBLIC_BASE_URL}/images/common/prepity_og.png`}
        />
        <meta
          property="og:url"
          content={`${process.env.NEXT_PUBLIC_BASE_URL}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@praveentcom" />
        <meta
          name="twitter:title"
          content="Prepity | AI-Powered MCQ Questions Generator"
        />
        <meta
          name="twitter:description"
          content="Prepity helps to generate MCQ questions for exams, interviews and for fun with the help of AI. It can create any kind of questions with ease and in seconds."
        />
        <meta
          name="twitter:image"
          content={`${process.env.NEXT_PUBLIC_BASE_URL}/images/common/prepity_og.png`}
        />
        <meta name="apple-mobile-web-app-title" content="Prepity" />
        <link rel="manifest" href="/images/favicon/manifest.json" />
      </Head>
      <body className="antialiased h-full bg-muted">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
