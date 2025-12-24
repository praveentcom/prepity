import { useEffect, useState, useCallback } from 'react';
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
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { IconToggle } from '@/components/ui/icon-toggle';
import { Markdown } from '@workspace/ui/components/markdown';

/**
 * Maximum polling attempts
 */
const MAX_POLLING_ATTEMPTS = 75;

/**
 * Polling interval
 */
const POLLING_INTERVAL = 3000;

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

/**
 * PageSkeleton component shown while loading
 * @returns The PageSkeleton component
 */
const PageSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-row items-center justify-between gap-2">
      <div className="h-8 bg-muted-foreground/20 rounded w-1/2 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-3 sm:col-span-2">
        <div className="grid grid-cols-1 gap-6">
          <QuestionSkeleton />
          <QuestionSkeleton />
        </div>
      </div>
      <div className="col-span-3 sm:col-span-1">
        <Card>
          <CardHeader>
            <div className="h-5 bg-muted-foreground/20 rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default function RequestPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState<{
    request: Request | null;
    questions: Question[];
  }>({ request: null, questions: [] });

  const [ui, setUi] = useState({
    isLoading: true,
    isDeleting: false,
    isRetrying: false,
    deleteDialogOpen: false,
    pollingExhausted: false,
  });

  const { request, questions } = data;
  const {
    isLoading,
    isDeleting,
    isRetrying,
    deleteDialogOpen,
    pollingExhausted,
  } = ui;

  const fetchRequestData = useCallback(
    async (slug: string) => {
      try {
        const res = await fetch(`/api/requests/read?requestSlug=${slug}`);
        if (!res.ok) {
          router.replace('/');
          return;
        }

        const { request: fetchedRequest, questions: fetchedQuestions } =
          await res.json();
        setData({ request: fetchedRequest, questions: fetchedQuestions || [] });

        if (
          [RequestStatus.PENDING, RequestStatus.PARTIALLY_CREATED].includes(
            fetchedRequest.status
          )
        ) {
          try {
            const processingRes = await fetch('/api/requests/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId: fetchedRequest.id }),
            });
            if (processingRes.ok) {
              setData((prev) => ({
                ...prev,
                request: prev.request
                  ? { ...prev.request, status: RequestStatus.PROCESSING }
                  : null,
              }));
            }
          } catch (error) {
            console.error('Error starting processing:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching request:', error);
        router.replace('/');
      } finally {
        setUi((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [router]
  );

  useEffect(() => {
    if (id && typeof id === 'string') {
      setUi((prev) => ({ ...prev, isLoading: true, pollingExhausted: false }));
      fetchRequestData(id);
    }
  }, [id, fetchRequestData]);

  useEffect(() => {
    if (!request) return;

    let pollingAttempts = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let cancelled = false;

    const pollRequestAndQuestions = async () => {
      if (cancelled) return;

      if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
        setUi((prev) => ({ ...prev, pollingExhausted: true }));
        return;
      }

      try {
        const res = await fetch(`/api/requests/read?id=${request.id}`);
        if (res.ok && !cancelled) {
          const responseData = await res.json();
          setData({
            request: responseData.request,
            questions: responseData.questions || [],
          });

          if (
            ![
              RequestStatus.CREATED,
              RequestStatus.FAILED,
              RequestStatus.PARTIALLY_CREATED,
            ].includes(responseData.request.status)
          ) {
            pollingAttempts++;
            timeoutId = setTimeout(pollRequestAndQuestions, POLLING_INTERVAL);
          }
        }
      } catch (error) {
        console.error('Error polling request:', error);
      }
    };

    if (request.status === RequestStatus.PROCESSING && !pollingExhausted) {
      pollRequestAndQuestions();
    }

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [request?.id, request?.status, pollingExhausted]);

  /**
   * toggleStarStatus function for the RequestPage component
   * @returns The toggleStarStatus function
   */
  const toggleStarStatus = async () => {
    if (!request) return;
    const previousState = request.isStarred;
    const newState = !previousState;

    setData((prev) => ({
      ...prev,
      request: prev.request ? { ...prev.request, isStarred: newState } : null,
    }));

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
      setData((prev) => ({
        ...prev,
        request: prev.request
          ? { ...prev.request, isStarred: previousState }
          : null,
      }));
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
    setData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, isStarred: star } : q
      ),
    }));

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
      setData((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === questionId ? { ...q, isStarred: !star } : q
        ),
      }));
      console.error('Error toggling question star status:', error);
      throw error;
    }
  };

  /**
   * handleDeleteRequest function for the RequestPage component
   * @returns The handleDeleteRequest function
   */
  const handleDeleteRequest = async () => {
    if (!request) return;
    setUi((prev) => ({ ...prev, isDeleting: true }));
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

        toast.success('Request deleted', {
          description: 'The request and all its questions have been deleted.',
        });
        router.push('/');
      } else {
        toast.error('Failed to delete the request. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setUi((prev) => ({
        ...prev,
        isDeleting: false,
        deleteDialogOpen: false,
      }));
    }
  };

  /**
   * handleRetry function for the RequestPage component
   * @returns The handleRetry function
   */
  const handleRetry = async () => {
    if (!request) return;
    setUi((prev) => ({ ...prev, isRetrying: true }));
    try {
      const res = await fetch('/api/requests/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (res.ok) {
        setUi((prev) => ({ ...prev, pollingExhausted: false }));
        setData((prev) => ({
          ...prev,
          request: prev.request
            ? { ...prev.request, status: RequestStatus.PROCESSING }
            : null,
        }));
        toast.success('Retrying generation', {
          description: 'Question generation has been restarted.',
        });
      } else {
        const responseData = await res.json();
        toast.error(responseData.message || 'Failed to restart generation.');
      }
    } catch (error) {
      console.error('Error retrying:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setUi((prev) => ({ ...prev, isRetrying: false }));
    }
  };

  if (isLoading || !request) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg truncate font-medium flex items-center gap-2">
          <IconToggle
            isStarred={request.isStarred}
            onToggle={toggleStarStatus}
          />
          <div className="truncate">{request.title || request.query}</div>
        </h1>
        <div className="flex items-center gap-4 shrink-0">
          {request.status === RequestStatus.PROCESSING && !pollingExhausted && (
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled
            >
              <Loader2 className="size-4 animate-spin" />
              Generating ({questions.length}/{request.initQuestionsCount}
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
                    Retry ({questions.length}/{request.initQuestionsCount})
                  </>
                )}
              </Button>
            )}
          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) =>
              setUi((prev) => ({ ...prev, deleteDialogOpen: open }))
            }
          >
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
                    : request.initQuestionsCount}{' '}
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
                  <div className="flex flex-col gap-2">
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
                                setData((prev) => ({
                                  ...prev,
                                  questions: prev.questions.map((q) =>
                                    q.id === question.id
                                      ? {
                                          ...q,
                                          userAnswer: optionNum,
                                          isAnswered: true,
                                          answeredAt: new Date(),
                                        }
                                      : q
                                  ),
                                }));

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
                                      setData((prev) => {
                                        const wrongQuestions =
                                          prev.questions.filter(
                                            (q) =>
                                              q.isAnswered &&
                                              q.correctOption !== q.userAnswer
                                          ).length;
                                        if (wrongQuestions === 3) {
                                          toast.info('Patience is the key 🔑', {
                                            description:
                                              "Use the hint button before submitting the answer if you're stuck.",
                                          });
                                        }
                                        return prev;
                                      });
                                    }

                                    if (pendingQuestionsForAnswersCount === 0) {
                                      setData((prev) => {
                                        const allCorrect = prev.questions.every(
                                          (q) =>
                                            q.correctOption === q.userAnswer
                                        );
                                        if (allCorrect) {
                                          toast.success("All correct, you're amazing! 🥳", {
                                            description:
                                              'You can now see the answers and explanations. Keep up the good work, generate more questions to practice!',
                                          });
                                        } else {
                                          toast.info('All questions answered 🎉', {
                                            description:
                                              "You've answered all the questions. You can now see the answers and explanations, and generate more to practice!",
                                          });
                                        }
                                        return prev;
                                      });
                                    }
                                  } else {
                                    setData((prev) => ({
                                      ...prev,
                                      questions: prev.questions.map((q) =>
                                        q.id === question.id
                                          ? {
                                              ...q,
                                              userAnswer: null,
                                              isAnswered: false,
                                              answeredAt: null,
                                            }
                                          : q
                                      ),
                                    }));
                                    toast.error('Failed to submit answer', {
                                      description:
                                        'Please try again or refresh the page.',
                                    });
                                  }
                                } catch (error) {
                                  console.error(
                                    'Error submitting answer:',
                                    error
                                  );
                                  setData((prev) => ({
                                    ...prev,
                                    questions: prev.questions.map((q) =>
                                      q.id === question.id
                                        ? {
                                            ...q,
                                            userAnswer: null,
                                            isAnswered: false,
                                            answeredAt: null,
                                          }
                                        : q
                                    ),
                                  }));
                                  toast.error('Error submitting answer', {
                                    description:
                                      'Network error. Please check your connection and try again.',
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
              <QuestionSkeleton key={`skeleton-${request.id}`} />
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
  }

  return <Markdown content={text.trim()} theme="vs" />;
}
