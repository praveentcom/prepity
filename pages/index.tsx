'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import GenerateQuestionsForm from '@/components/blocks/forms/generate-questions';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/list?limit=100`,
      {
        headers: {
          cookie: context.req.headers.cookie || '',
        },
      }
    );

    if (!res.ok) {
      return {
        props: {
          initialRequests: [],
        },
      };
    }

    const data = await res.json();
    return {
      props: {
        initialRequests: data.requests || [],
      },
    };
  } catch (error) {
    console.error('Error fetching initial requests:', error);
    return {
      props: {
        initialRequests: [],
      },
    };
  }
};

export default function Home() {
  return (
    <div className="grid gap-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Generate questions</CardTitle>
          <CardDescription>
            Choose your category and specify your focus area to generate
            practice questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateQuestionsForm />
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground/50">
            Questions are generated based on available information from the
            internet and LLM model ability. Excercise caution when using
            questions generated and report any issues. Questions generated will
            be saved in your library.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
