import { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import {
  Request,
  Question,
  RequestStatus,
  QuestionType,
  AnswerType,
} from '@prisma/client';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import {
  LightbulbIcon,
  Loader2,
  Hourglass,
  ChartBar,
  CloudAlert,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { deleteRequest } from '@/lib/client/requests';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import Markdown from 'react-markdown';
import { CATEGORY_LIST } from '@/lib/client/constants';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { StarToggle } from '@/components/ui/star-toggle';

interface Props {
  initialRequest: Request;
}

const MAX_POLLING_ATTEMPTS = 75;
const POLLING_INTERVAL = 3000;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/read?requestSlug=${id}`,
    {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    }
  );

  if (!res.ok) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const { request } = await res.json();

  const startProcessing = async () => {
    try {
      const processingRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: context.req.headers.cookie || '',
          },
          body: JSON.stringify({ requestId: request.id }),
        }
      );

      if (processingRes.ok) {
        request.status = RequestStatus.PROCESSING;
      }
    } catch (error) {
      console.error('Error starting processing:', error);
    }
  };

  if (
    [RequestStatus.PENDING, RequestStatus.PARTIALLY_CREATED].includes(
      request.status
    )
  ) {
    await startProcessing();
  }

  return {
    props: {
      initialRequest: request,
    },
  };
};

const QuestionSkeleton = () => (
  <div className="bg-white sm:rounded-lg animate-pulse">
    <div className="px-4 py-5 sm:p-6">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="space-y-4 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

export default function RequestPage({ initialRequest }: Props) {
  return <Content initialRequest={initialRequest} />;
}

function Content({ initialRequest }: Props) {
  const [request, setRequest] = useState(initialRequest);
  const [questions, setQuestions] = useState<Question[]>([]);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchQuestions = async (requestId: number | string) => {
    try {
      const res = await fetch(`/api/questions/list?requestId=${requestId}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  useEffect(() => {
    var pollingAttempts = 0;

    const pollRequestAndQuestions = async () => {
      if (
        request.status === RequestStatus.PROCESSING &&
        pollingAttempts < MAX_POLLING_ATTEMPTS
      ) {
        try {
          await fetchQuestions(initialRequest.id);

          const res = await fetch(`/api/requests/read?id=${initialRequest.id}`);
          if (res.ok) {
            const data = await res.json();
            setRequest(data.request);

            if (
              ![
                RequestStatus.CREATED,
                RequestStatus.FAILED,
                RequestStatus.PARTIALLY_CREATED,
              ].includes(data.request.status)
            ) {
              pollingAttempts++;

              setTimeout(pollRequestAndQuestions, POLLING_INTERVAL);
            }
          }
        } catch (error) {
          console.error('Error polling request:', error);
        }
      }
    };

    if (initialRequest.status === RequestStatus.PROCESSING) {
      pollRequestAndQuestions();
    } else {
      fetchQuestions(initialRequest.id);
    }
  }, [router.query]);

  const toggleStarStatus = async () => {
    const previousState = request.isStarred;
    const newState = !previousState;

    setRequest((prev) => ({ ...prev, isStarred: newState }));

    try {
      const res = await fetch('/api/requests/star', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestSlug: request.requestSlug }),
      });
      if (!res.ok) {
        throw new Error('Failed to update star status');
      }

      const storedRequests = localStorage.getItem('requests');
      if (storedRequests) {
        const requests = JSON.parse(storedRequests);
        const updatedRequests = requests.map((r: Request) =>
          r.requestSlug === request.requestSlug
            ? { ...r, isStarred: newState }
            : r
        );
        localStorage.setItem('requests', JSON.stringify(updatedRequests));
        window.dispatchEvent(new Event('requests-updated'));
      }
    } catch (error) {
      setRequest((prev) => ({ ...prev, isStarred: previousState }));
      console.error('Error toggling star status:', error);
      throw error;
    }
  };

  const toggleQuestionStarStatus = async (
    questionId: number,
    star: boolean
  ) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === questionId ? { ...q, isStarred: star } : q
      )
    );

    try {
      const res = await fetch('/api/questions/star', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionId, star }),
      });
      if (!res.ok) {
        throw new Error('Failed to update star status');
      }
    } catch (error) {
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.id === questionId ? { ...q, isStarred: !star } : q
        )
      );
      console.error('Error toggling question star status:', error);
      throw error;
    }
  };

  const handleDeleteRequest = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteRequest(request.requestSlug);
      if (success) {
        const storedRequests = localStorage.getItem('requests');
        if (storedRequests) {
          const requests = JSON.parse(storedRequests);
          const updatedRequests = requests.filter(
            (r: Request) => r.requestSlug !== request.requestSlug
          );
          localStorage.setItem('requests', JSON.stringify(updatedRequests));
        }

        toast({
          title: 'Request deleted',
          description: 'The request and all its questions have been deleted.',
          variant: 'default',
        });
        router.push('/');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete the request. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg font-medium flex items-center gap-2">
          {initialRequest.query}
          <StarToggle
            isStarred={request.isStarred}
            onToggle={toggleStarStatus}
          />
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {request.status === RequestStatus.PROCESSING && (
            <Badge
              variant="default"
              className="flex text-xs items-center gap-1 animate-pulse"
            >
              <Hourglass className="size-3" />
              Generating questions ({questions.length}/
              {initialRequest.initQuestionsCount})...
            </Badge>
          )}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this request?</DialogTitle>
                <DialogDescription>
                  This will permanently delete this request and all{' '}
                  {questions.length > 0
                    ? questions.length
                    : initialRequest.initQuestionsCount}{' '}
                  questions associated with it. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRequest}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      Delete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 sm:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            {questions.map((question, index) => (
              <Card
                key={`question-${question.id}`}
                className={`transition-opacity duration-500 ease-in-out opacity-100`}
              >
                <CardHeader>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      Question {index + 1}
                      <StarToggle
                        isStarred={question.isStarred}
                        onToggle={() =>
                          toggleQuestionStarStatus(
                            question.id,
                            !question.isStarred
                          )
                        }
                        size="small"
                        variant="bookmark"
                      />
                    </h4>
                    <QuestionRenderer
                      text={question.question}
                      type={question.questionType}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-5">
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((optionNum) => {
                        let buttonClass =
                          'w-full text-left px-3.5 py-2.5 border rounded-lg';

                        if (question.isAnswered) {
                          buttonClass += ' cursor-not-allowed';
                        } else {
                          buttonClass += ' hover:bg-gray-50';
                        }

                        if (question.isAnswered) {
                          if (optionNum === question.correctOption) {
                            buttonClass += ' answer-correct';
                          } else if (question.userAnswer === optionNum) {
                            buttonClass += ' answer-incorrect';
                          }
                        } else {
                          if (question.userAnswer === optionNum) {
                            buttonClass += ' border-blue-500 bg-blue-50';
                          } else {
                            buttonClass += ' border-gray-300';
                          }
                        }

                        const options = [
                          question.option1,
                          question.option2,
                          question.option3,
                          question.option4,
                        ];

                        return (
                          <button
                            key={optionNum}
                            className={buttonClass}
                            disabled={question.isAnswered}
                            onClick={async () => {
                              if (!question.isAnswered) {
                                try {
                                  const res = await fetch(
                                    '/api/questions/submit-answer',
                                    {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        questionId: question.id,
                                        answerId: optionNum,
                                      }),
                                    }
                                  );

                                  if (res.ok) {
                                    await fetchQuestions(initialRequest.id);

                                    const { pendingQuestionsForAnswersCount } =
                                      await res.json();

                                    if (question.correctOption !== optionNum) {
                                      const wrongQuestions = questions.filter(
                                        (q) =>
                                          q.isAnswered &&
                                          q.correctOption !== q.userAnswer
                                      ).length;
                                      if (wrongQuestions === 2) {
                                        toast({
                                          title: 'Patience is the key 🔑',
                                          description:
                                            "Use the hint button before submitting the answer if you're stuck.",
                                          variant: 'default',
                                          duration: 10000,
                                        });
                                      }
                                    }

                                    if (pendingQuestionsForAnswersCount === 0) {
                                      if (
                                        questions.every(
                                          (q) =>
                                            q.correctOption === q.userAnswer
                                        )
                                      ) {
                                        toast({
                                          title:
                                            "All correct, you're amazing! 🥳",
                                          description:
                                            'You can now see the answers and explanations. Keep up the good work, generate more questions to practice!',
                                          variant: 'default',
                                          duration: 10000,
                                        });
                                      } else {
                                        toast({
                                          title: 'All questions answered 🎉',
                                          description:
                                            "You've answered all the questions. You can now see the answers and explanations, and generate more to practice!",
                                          variant: 'default',
                                          duration: 10000,
                                        });
                                      }
                                    }
                                  }
                                } catch (error) {
                                  console.error(
                                    'Error submitting answer:',
                                    error
                                  );
                                }
                              }
                            }}
                          >
                            <QuestionRenderer
                              text={options[optionNum - 1]}
                              type={question.answerType}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {!question.isAnswered && (
                      <div className="flex gap-3 md:flex-row flex-col">
                        <HintDialog question={question} />
                      </div>
                    )}
                  </div>
                </CardContent>
                {question.isAnswered && (
                  <CardFooter>
                    <div className="text-muted-foreground grid gap-4 w-full">
                      <hr />
                      <div className="flex flex-col gap-0.5">
                        <h4 className="text-sm font-medium">Explanation</h4>
                        <QuestionRenderer
                          small
                          text={
                            question.explanation || 'No explanation provided'
                          }
                          type={question.answerType}
                        />
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}

            {request.status === RequestStatus.PROCESSING && (
              <QuestionSkeleton key={`skeleton-${initialRequest.id}`} />
            )}
          </div>
        </div>
        <div className="col-span-3 sm:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Questions Summary</CardTitle>
              <CardDescription>
                Summary will be updated as you answer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {questions.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {request.status === RequestStatus.PARTIALLY_CREATED && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-row gap-1.5 items-center">
                        <CloudAlert className="size-3.5" />
                        <p className="text-sm font-medium">
                          Partially generated
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">
                          Uh-ho, our AI was not able to generate all{' '}
                          {request.initQuestionsCount} questions requested.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Don't worry, just{' '}
                          <button
                            onClick={() => router.reload()}
                            className="underline hover:text-foreground transition-colors"
                          >
                            refresh this page
                          </button>{' '}
                          and we'll generate the remaining{' '}
                          {request.initQuestionsCount - questions.length}{' '}
                          questions for you.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-row gap-1.5 items-center">
                      <ChartBar className="size-3.5" />
                      <p className="text-sm font-medium">Attempt Results</p>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm text-muted-foreground">
                        Total Questions: {questions.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Answered:{' '}
                        {
                          questions.filter((question) => question.isAnswered)
                            .length
                        }{' '}
                        (
                        {Math.round(
                          (questions.filter((question) => question.isAnswered)
                            .length /
                            questions.length) *
                            100
                        )}
                        %)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Correct:{' '}
                        {
                          questions.filter(
                            (question) =>
                              question.isAnswered &&
                              question.correctOption === question.userAnswer
                          ).length
                        }{' '}
                        (
                        {Math.round(
                          (questions.filter(
                            (question) =>
                              question.isAnswered &&
                              question.correctOption === question.userAnswer
                          ).length /
                            questions.length) *
                            100
                        )}
                        %)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">
                    No questions generated yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HintDialog({ question }: { question: Question }) {
  const [showHint2, setShowHint2] = useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setShowHint2(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-max">
          <LightbulbIcon className="size-4" />
          Show hint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LightbulbIcon className="size-5" />
            Hint
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <QuestionRenderer
              text={question.hint || ''}
              type={question.questionType}
            />
          </div>
          {!showHint2 && question.hint2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHint2(true)}
              className="w-full"
            >
              <LightbulbIcon className="size-4" />
              Show second hint
            </Button>
          )}
          {showHint2 && question.hint2 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Second Hint</h4>
              <QuestionRenderer
                text={question.hint2}
                type={question.questionType}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionRenderer({
  text,
  type,
  small,
}: {
  text: string;
  type: QuestionType | AnswerType;
  small?: boolean;
}) {
  if (type === 'LATEX') {
    return <Latex>{text}</Latex>;
  } else if (type === 'CODE') {
    return <code className={small ? 'text-sm' : ''}>{text}</code>;
  } else if (type === 'PLAINTEXT') {
    if (text.includes('`') || text.includes('*')) {
      return (
        <div className="prose">
          <Markdown
            components={{
              p: ({ children }) => (
                <p className={small ? 'text-sm' : ''}>{children}</p>
              ),
            }}
          >
            {text}
          </Markdown>
        </div>
      );
    } else {
      return <p className={small ? 'text-sm' : ''}>{text}</p>;
    }
  }
}
