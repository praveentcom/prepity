import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import GenerateQuestionsForm from '@/components/blocks/forms/generate-questions';

export default function Home() {
  return (
    <div className="grid gap-6">
      <Card className="w-full max-w-3xl mt-2">
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
