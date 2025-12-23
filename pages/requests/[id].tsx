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
  CloudAlert,
  Trash2,
  RotateCcw,
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
import { toast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconToggle } from '@/components/ui/icon-toggle';

/**
 * Props interface for the RequestPage component
 */
interface Props {
  initialRequest: Request;
  initialQuestions: Question[];
}

/**
 * Maximum polling attempts
 */
const MAX_POLLING_ATTEMPTS = 75;

/**
 * Polling interval
 */
const POLLING_INTERVAL = 3000;

/**
 * getServerSideProps function for the RequestPage component
 * @param context - The context object
 * @returns The server side props
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};

  const [requestRes, sidebarRes] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/read?requestSlug=${id}`,
      {
        headers: {
          cookie: context.req.headers.cookie || '',
        },
      }
    ),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/list?limit=100`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    }),
  ]);

  if (!requestRes.ok) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const { request, questions } = await requestRes.json();
  const sidebarData = sidebarRes.ok
    ? await sidebarRes.json()
    : { requests: [] };

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
      initialQuestions: questions || [],
      initialRequests: sidebarData.requests || [],
    },
  };
};

/**
 * QuestionSkeleton component for the RequestPage component
 * @returns The QuestionSkeleton component
 */
const QuestionSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="space-y-3 animate-pulse duration-900">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4 animate-pulse duration-900">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted-foreground/20 rounded"></div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function RequestPage({
  initialRequest,
  initialQuestions,
}: Props) {
  return (
    <Content
      initialRequest={initialRequest}
      initialQuestions={initialQuestions}
    />
  );
}

/**
 * Content component for the RequestPage component
 * @param initialRequest - The initial request
 * @param initialQuestions - The initial questions
 * @returns The Content component
 */
function Content({ initialRequest, initialQuestions }: Props) {
  const [request, setRequest] = useState(initialRequest);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pollingExhausted, setPollingExhausted] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setQuestions(initialQuestions);
    setRequest(initialRequest);
    setPollingExhausted(false);
  }, [router.query.id]);

  useEffect(() => {
    let pollingAttempts = 0;

    const pollRequestAndQuestions = async () => {
      if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
        setPollingExhausted(true);
        return;
      }

      try {
        const res = await fetch(`/api/requests/read?id=${initialRequest.id}`);
        if (res.ok) {
          const data = await res.json();
          setRequest(data.request);

          if (data.questions) {
            setQuestions(data.questions);
          }

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
    };

    if (request.status === RequestStatus.PROCESSING && !pollingExhausted) {
      pollRequestAndQuestions();
    }
  }, [initialRequest.id, request.status, pollingExhausted]);

  /**
   * toggleStarStatus function for the RequestPage component
   * @returns The toggleStarStatus function
   */
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

  /**
   * toggleQuestionStarStatus function for the RequestPage component
   * @param questionId - The question id
   * @param star - The star status
   * @returns The toggleQuestionStarStatus function
   */
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

  /**
   * handleDeleteRequest function for the RequestPage component
   * @returns The handleDeleteRequest function
   */
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

  /**
   * handleRetry function for the RequestPage component
   * @returns The handleRetry function
   */
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await fetch('/api/requests/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (res.ok) {
        setPollingExhausted(false);
        setRequest((prev) => ({ ...prev, status: RequestStatus.PROCESSING }));
        toast({
          title: 'Retrying generation',
          description: 'Question generation has been restarted.',
          variant: 'default',
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Retry failed',
          description: data.message || 'Failed to restart generation.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error retrying:', error);
      toast({
        title: 'Retry failed',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg truncate font-medium flex items-center gap-2">
          <IconToggle
            isStarred={request.isStarred}
            onToggle={toggleStarStatus}
          />
          <div className="truncate">{initialRequest.query}</div>
        </h1>
        <div className="flex items-center gap-4 shrink-0">
          {request.status === RequestStatus.PROCESSING && !pollingExhausted && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled
            >
              <Loader2 className="size-4 animate-spin" />
              Generating ({questions.length}/{initialRequest.initQuestionsCount}
              )...
            </Button>
          )}
          {(
            [
              RequestStatus.PROCESSING,
              RequestStatus.PARTIALLY_CREATED,
              RequestStatus.FAILED,
            ] as RequestStatus[]
          ).includes(request.status as RequestStatus) &&
            pollingExhausted && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    Retry ({questions.length}/
                    {initialRequest.initQuestionsCount})
                  </>
                )}
              </Button>
            )}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
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
                <Button onClick={handleDeleteRequest} disabled={isDeleting}>
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
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-3 sm:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            {questions.map((question, index) => (
              <Card
                key={`question-${question.id}`}
                className={`transition-opacity duration-500 ease-in-out opacity-100`}
              >
                <CardHeader>
                  <div className="flex flex-col">
                    <h4 className="flex items-center gap-2 font-semibold">
                      Q{index + 1}
                      <IconToggle
                        isStarred={question.isStarred}
                        onToggle={() =>
                          toggleQuestionStarStatus(
                            question.id,
                            !question.isStarred
                          )
                        }
                        icon="bookmark"
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
                          'w-full text-left px-3 py-1.5 border rounded-md';

                        if (question.isAnswered) {
                          buttonClass += ' cursor-not-allowed';
                        } else {
                          buttonClass += ' hover:bg-muted';
                        }

                        if (question.isAnswered) {
                          if (optionNum === question.correctOption) {
                            buttonClass +=
                              ' answer-correct dark:answer-correct-dark';
                          } else if (question.userAnswer === optionNum) {
                            buttonClass +=
                              ' answer-incorrect dark:answer-incorrect-dark';
                          }
                        } else {
                          if (question.userAnswer === optionNum) {
                            buttonClass += ' border-primary bg-primary/10';
                          } else {
                            buttonClass += ' border-input';
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
                                setQuestions((prevQuestions) =>
                                  prevQuestions.map((q) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          userAnswer: optionNum,
                                          isAnswered: true,
                                          answeredAt: new Date(),
                                        }
                                      : q
                                  )
                                );

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
                                    const { pendingQuestionsForAnswersCount } =
                                      await res.json();

                                    if (question.correctOption !== optionNum) {
                                      setQuestions((prevQuestions) => {
                                        const wrongQuestions =
                                          prevQuestions.filter(
                                            (q) =>
                                              q.isAnswered &&
                                              q.correctOption !== q.userAnswer
                                          ).length;
                                        if (wrongQuestions === 3) {
                                          toast({
                                            title: 'Patience is the key 🔑',
                                            description:
                                              "Use the hint button before submitting the answer if you're stuck.",
                                            variant: 'default',
                                            duration: 10000,
                                          });
                                        }
                                        return prevQuestions;
                                      });
                                    }

                                    if (pendingQuestionsForAnswersCount === 0) {
                                      setQuestions((prevQuestions) => {
                                        const allCorrect = prevQuestions.every(
                                          (q) =>
                                            q.correctOption === q.userAnswer
                                        );
                                        if (allCorrect) {
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
                                        return prevQuestions;
                                      });
                                    }
                                  } else {
                                    setQuestions((prevQuestions) =>
                                      prevQuestions.map((q) =>
                                        q.id === question.id
                                          ? {
                                              ...q,
                                              userAnswer: null,
                                              isAnswered: false,
                                              answeredAt: null,
                                            }
                                          : q
                                      )
                                    );
                                    toast({
                                      title: 'Failed to submit answer',
                                      description:
                                        'Please try again or refresh the page.',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error) {
                                  console.error(
                                    'Error submitting answer:',
                                    error
                                  );
                                  setQuestions((prevQuestions) =>
                                    prevQuestions.map((q) =>
                                      q.id === question.id
                                        ? {
                                            ...q,
                                            userAnswer: null,
                                            isAnswered: false,
                                            answeredAt: null,
                                          }
                                        : q
                                    )
                                  );
                                  toast({
                                    title: 'Error submitting answer',
                                    description:
                                      'Network error. Please check your connection and try again.',
                                    variant: 'destructive',
                                  });
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
                      <div className="flex flex-col gap-2">
                        <p>Explanation</p>
                        <QuestionRenderer
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
        <div className="col-span-3 sm:col-span-1 sm:sticky sm:top-6 sm:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Your Practice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {request.status === RequestStatus.PARTIALLY_CREATED && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2 items-center">
                    <CloudAlert className="size-4" />
                    <p className="font-medium">Partially generated</p>
                  </div>
                  <p className="text-muted-foreground">
                    Uh-ho, system was not able to generate all{' '}
                    {request.initQuestionsCount} questions requested.
                  </p>
                </div>
              )}
              {questions.length > 0 ? (
                <p className="text-muted-foreground">
                  {questions.length} questions are generated for this practice,
                  and you have correctly answered{' '}
                  {
                    questions.filter(
                      (question) =>
                        question.isAnswered &&
                        question.correctOption === question.userAnswer
                    ).length
                  }{' '}
                  of{' '}
                  {questions.filter((question) => question.isAnswered).length}{' '}
                  so far.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  No questions generated yet.
                </p>
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
              onClick={() => setShowHint2(true)}
              className="w-full"
            >
              <LightbulbIcon className="size-4" />
              Show second hint
            </Button>
          )}
          {showHint2 && question.hint2 && (
            <div className="pt-4 border-t">
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
}: {
  text: string;
  type: QuestionType | AnswerType;
}) {
  if (type === 'LATEX') {
    return <Latex>{text}</Latex>;
  } else if (type === 'CODE') {
    return <code>{text}</code>;
  } else if (type === 'PLAINTEXT') {
    if (text.includes('`') || text.includes('*')) {
      return (
        <div className="prose dark:prose-invert">
          <Markdown
            components={{
              p: ({ children }) => <p>{children}</p>,
            }}
          >
            {text}
          </Markdown>
        </div>
      );
    } else {
      return <p>{text}</p>;
    }
  }
}
