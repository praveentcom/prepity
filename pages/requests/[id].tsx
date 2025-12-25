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
  Timer,
  Play,
  Pause,
  Square,
  PencilIcon,
  Sparkles,
  RefreshCw,
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
import { Textarea } from '@/components/ui/textarea';

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

  const [scribbleContent, setScribbleContent] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`scribble-${id}`);
      return saved || '';
    }
    return '';
  });

  const [timerState, setTimerState] = useState({
    isRunning: false,
    isPaused: false,
    isStopped: false,
    startTime: null as number | null,
    pausedTime: null as number | null,
    totalPausedDuration: 0,
  });

  const [elapsedTime, setElapsedTime] = useState(0);

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
   * useEffect to save the scribble content to sessionStorage
   * @returns The useEffect to save the scribble content to sessionStorage
   */
  useEffect(() => {
    if (id && typeof id === 'string') {
      sessionStorage.setItem(`scribble-${id}`, scribbleContent);
    }
  }, [scribbleContent, id]);

  /**
   * Format time in milliseconds to HH:MM:SS
   */
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format timestamp to readable date
   */
  const formatStartTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Not started';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  /**
   * Start the timer
   */
  const handleStartTimer = () => {
    if (!id || typeof id !== 'string') return;
    const timerKey = `timer-${id}`;
    const now = Date.now();
    const newTimerState = {
      isRunning: true,
      isPaused: false,
      isStopped: false,
      startTime: now,
      pausedTime: null,
      totalPausedDuration: 0,
    };
    setTimerState(newTimerState);
    localStorage.setItem(timerKey, JSON.stringify(newTimerState));
  };

  /**
   * Pause the timer
   */
  const handlePauseTimer = () => {
    if (!id || typeof id !== 'string' || !timerState.startTime) return;
    const timerKey = `timer-${id}`;
    const now = Date.now();
    const newTimerState = {
      ...timerState,
      isRunning: false,
      isPaused: true,
      pausedTime: now,
    };
    setTimerState(newTimerState);
    localStorage.setItem(timerKey, JSON.stringify(newTimerState));
  };

  /**
   * Resume the timer
   */
  const handleResumeTimer = () => {
    if (!id || typeof id !== 'string' || !timerState.startTime) return;
    const timerKey = `timer-${id}`;
    const now = Date.now();
    let newTimerState;

    if (timerState.isStopped) {
      newTimerState = {
        ...timerState,
        isRunning: true,
        isPaused: false,
        isStopped: false,
        startTime: now - elapsedTime,
        pausedTime: null,
        totalPausedDuration: 0,
      };
    } else if (timerState.isPaused) {
      const pauseDuration = now - (timerState.pausedTime || 0);
      newTimerState = {
        ...timerState,
        isRunning: true,
        isPaused: false,
        pausedTime: null,
        totalPausedDuration: timerState.totalPausedDuration + pauseDuration,
      };
    } else {
      return;
    }

    setTimerState(newTimerState);
    localStorage.setItem(timerKey, JSON.stringify(newTimerState));
  };

  /**
   * Stop the timer
   */
  const handleStopTimer = () => {
    if (!id || typeof id !== 'string' || !timerState.startTime) return;
    const timerKey = `timer-${id}`;
    const now = Date.now();
    const finalElapsedTime = now - timerState.startTime - timerState.totalPausedDuration;
    const newTimerState = {
      ...timerState,
      isRunning: false,
      isPaused: false,
      isStopped: true,
      stoppedAt: now,
    };
    setTimerState(newTimerState);
    setElapsedTime(finalElapsedTime);
    localStorage.setItem(timerKey, JSON.stringify(newTimerState));
  };

  /**
   * Reset the timer
   */
  const handleResetTimer = () => {
    if (!id || typeof id !== 'string') return;
    const timerKey = `timer-${id}`;
    const newTimerState = {
      isRunning: false,
      isPaused: false,
      isStopped: false,
      startTime: null as number | null,
      pausedTime: null as number | null,
      totalPausedDuration: 0,
    };
    setTimerState(newTimerState);
    setElapsedTime(0);
    localStorage.setItem(timerKey, JSON.stringify(newTimerState));
  };

  /**
    * useEffect to load the timer state from localStorage on mount
    * @returns The useEffect to load the timer state from localStorage on mount
    */
  useEffect(() => {
    if (id && typeof id === 'string') {
      const timerKey = `timer-${id}`;
      const savedTimer = localStorage.getItem(timerKey);
      
      /**
       * initialState for the timer
       */
      const initialState = {
        isRunning: false,
        isPaused: false,
        isStopped: false,
        startTime: null as number | null,
        pausedTime: null as number | null,
        totalPausedDuration: 0,
      };

      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          setTimerState(parsed);
          
          if (parsed.startTime) {
            let calculatedElapsed = 0;
            
            if (parsed.isStopped) {
              calculatedElapsed = parsed.stoppedAt - parsed.startTime - parsed.totalPausedDuration;
            } else if (parsed.isPaused && parsed.pausedTime) {
              calculatedElapsed = parsed.pausedTime - parsed.startTime - parsed.totalPausedDuration;
            } else if (parsed.isRunning) {
              const now = Date.now();
              calculatedElapsed = now - parsed.startTime - parsed.totalPausedDuration;
            }
            
            setElapsedTime(calculatedElapsed);
          }
        } catch (error) {
          console.error('Error parsing timer state:', error);
          setTimerState(initialState);
          setElapsedTime(0);
        }
      } else {
        setTimerState(initialState);
        setElapsedTime(0);
      }
    }
  }, [id]);

  /**
   * useEffect to update the elapsed time
   * @returns The useEffect to update the elapsed time
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState.isRunning && !timerState.isPaused && !timerState.isStopped && timerState.startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(now - (timerState.startTime || 0) - timerState.totalPausedDuration);
      }, 1000);
    } else if (timerState.isPaused && timerState.pausedTime) {
      setElapsedTime(timerState.pausedTime - (timerState.startTime || 0) - timerState.totalPausedDuration);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.isStopped, timerState.startTime, timerState.pausedTime, timerState.totalPausedDuration]);

  /**
   * useEffect to check if all questions are answered to auto-stop timer
   * @returns The useEffect to check if all questions are answered to auto-stop timer
   */
  useEffect(() => {
    if (questions.length > 0 && timerState.isRunning && !timerState.isStopped) {
      const allAnswered = questions.every(q => q.isAnswered);
      if (allAnswered) {
        handleStopTimer();
      }
    }
  }, [questions]);

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
      <div className="flex flex-row items-center justify-between gap-4">
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
                className={`transition-opacity duration-500 ease-in-out ${question.isAnswered ? 'opacity-60' : 'opacity-100'}`}
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
        <div className="col-span-3 sm:col-span-1 sm:sticky sm:top-6 sm:self-start flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Sparkles />
                Practice Summary
              </CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer />
                Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className={`text-3xl font-mono font-medium ${timerState.isRunning ? '' : timerState.isPaused ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!timerState.isRunning && !timerState.isPaused && !timerState.isStopped && (
                      <Button onClick={handleStartTimer} size="sm">
                        <Play className="size-4 mr-2" />
                        Start
                      </Button>
                    )}
                    {timerState.isRunning && (
                      <Button onClick={handlePauseTimer} size="sm" variant="outline">
                        <Pause className="size-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    {timerState.isPaused && !timerState.isStopped && (
                      <Button onClick={handleResumeTimer} size="sm" variant="outline">
                        <Play className="size-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    {timerState.isStopped && questions.length > 0 && !questions.every(q => q.isAnswered) && (
                      <>
                        <Button onClick={handleResumeTimer} size="sm" variant="outline">
                          <Play className="size-4 mr-2" />
                          Resume
                        </Button>
                        <Button onClick={handleResetTimer} size="sm" variant="outline">
                          <RefreshCw className="size-4 mr-2" />
                          Reset
                        </Button>
                      </>
                    )}
                    {(timerState.isRunning || timerState.isPaused) && (
                      <Button onClick={handleStopTimer} size="sm" variant="destructive">
                        <Square className="size-4 mr-2" />
                        Stop
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <PencilIcon />
                Rough Work Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Write your notes, calculations, or rough work here..."
                  value={scribbleContent}
                  onChange={(e) => setScribbleContent(e.target.value)}
                  className="min-h-[300px] resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  This is a rough work area. Content will be cleared when the tab is closed.
                </p>
              </div>
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
