import { GetServerSideProps } from 'next';
import { useEffect, useState} from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Request, Question, RequestStatus, QuestionType, AnswerType } from '@prisma/client';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckIcon, HourglassIcon, LightbulbIcon, StarIcon, Loader2, LibraryBig, Brain, CalendarCheck2, Hourglass, ChartBar, CloudAlert } from 'lucide-react';
import _ from 'lodash';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import Markdown from 'react-markdown';
import { CATEGORY_LIST } from '@/lib/client/constants';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
            const processingRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/requests/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', cookie: context.req.headers.cookie || '' },
                body: JSON.stringify({ requestId: request.id }),
            });

            if (processingRes.ok) {
                request.status = RequestStatus.PROCESSING;
            }
        } catch (error) {
            console.error('Error starting processing:', error);
        }
    };

    if ([RequestStatus.PENDING, RequestStatus.PARTIALLY_CREATED].includes(request.status)) {
        await startProcessing();
    }

	return {
		props: {
			initialRequest: request,
		},
	};
};

const QuestionSkeleton = () => (
	<div className="bg-white shadow sm:rounded-lg animate-pulse">
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
	return (
		<AuthenticatedLayout>
			<Content initialRequest={initialRequest} />
		</AuthenticatedLayout>
	);
}

function Content({ initialRequest }: Props) {
    const [request, setRequest] = useState(initialRequest);
	const [questions, setQuestions] = useState<Question[]>([]);
	const router = useRouter();
	const [loadingQuestionId, setLoadingQuestionId] = useState<number | null>(null);
    const [loadingAnswerId, setLoadingAnswerId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<{ [key: number]: boolean }>({});

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
			if (request.status === RequestStatus.PROCESSING && pollingAttempts < MAX_POLLING_ATTEMPTS) {
				try {
					await fetchQuestions(initialRequest.id);

					const res = await fetch(
						`/api/requests/read?id=${initialRequest.id}`
					);
					if (res.ok) {
						const data = await res.json();
						setRequest(data.request);

						if (![RequestStatus.CREATED, RequestStatus.FAILED, RequestStatus.PARTIALLY_CREATED].includes(data.request.status)) {
							pollingAttempts++;

							setTimeout(
								pollRequestAndQuestions,
								POLLING_INTERVAL
							);
						}
					}
				} catch (error) {
					console.error('Error polling request:', error);
				}
			}
		};

        if (
			initialRequest.status === RequestStatus.PROCESSING
		) {
			pollRequestAndQuestions();
		} else {
			fetchQuestions(initialRequest.id);
		}
	}, [router.query]);

    const toggleStarStatus = async () => {
        try {
            const res = await fetch('/api/requests/star', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestSlug: request.requestSlug }),
            });
            if (res.ok) {
                const updatedRequest = await res.json();
                setRequest(updatedRequest);

                toast({
                    title: `✅ Question set ${updatedRequest.isStarred ? 'starred' : 'unstarred'}`,
                    description: `Request completed successfully.`,
                    variant: 'default',
                    duration: 5000,
                });
            }
        } catch (error) {
            console.error('Error toggling star status:', error);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
                <h1 className="text-lg font-medium flex items-center gap-2 w-full md:w-auto">
                    {initialRequest.query}
                    <button onClick={toggleStarStatus} className="focus:outline-none">
                        <StarIcon className={`size-4 ${request.isStarred ? "text-yellow-600 fill-yellow-500" : "text-muted-foreground"}`} />
                    </button>
                </h1>
                {(request.status === RequestStatus.PROCESSING) && (
                    <Badge variant="default" className='flex text-xs items-center gap-1 animate-pulse'>
                        <Hourglass className='size-3' />
                        Generating questions ({questions.length}/{initialRequest.initQuestionsCount})...
                    </Badge>
                )}
            </div>
            <hr />
            <div className='flex flex-col md:flex-row gap-2 w-max'>
                <div className='flex flex-row gap-2 w-max'>
                    <Badge variant="outline" className='flex items-center gap-1 cursor-pointer'>
                        <LibraryBig className='size-3' />
                        {CATEGORY_LIST.find(category => 
                            category.category === initialRequest.category
                        )?.categoryName}
                    </Badge>
                    <Badge variant="outline" className='flex items-center gap-1 cursor-pointer'>
                        <Brain className='size-3' />
                        {initialRequest.difficulty.charAt(0).toUpperCase() + initialRequest.difficulty.slice(1).toLowerCase()}
                    </Badge>
                </div>
                <div className='flex flex-row gap-2 w-max'>
                    <Badge variant="outline" className='flex items-center gap-1 cursor-pointer'>
                        <CalendarCheck2 className='size-3' />
                        Generated on {moment(initialRequest.createdAt).format("DD MMM, hh:mm a")}
                    </Badge>
                </div>
            </div>
            <hr />
            <div className='grid grid-cols-3 gap-4'>
                <div className='col-span-3 sm:col-span-2'>
                    <div className="grid grid-cols-1 gap-6">
                        {questions.map((question, index) => (
                            <Card
                                key={`question-${question.id}`}
                                className={`transition-opacity duration-500 ease-in-out opacity-100`}>
                                <CardHeader>
                                    <div className='flex flex-col gap-0.5'>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                            Question {index + 1}
                                        </h4>
                                        <QuestionRenderer text={question.question} type={question.questionType} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-5">
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4].map((optionNum) => {
                                                let buttonClass = 'w-full text-left px-4 py-3 border rounded-lg';

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
                                                        disabled={question.isAnswered || loadingQuestionId === question.id}
                                                        onClick={async () => {
                                                            if (!question.isAnswered) {
                                                                setLoadingQuestionId(question.id);
                                                                setLoadingAnswerId(optionNum);
                                                                try {
                                                                    await fetch(
                                                                        '/api/questions/mark-answer',
                                                                        {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Content-Type':
                                                                                    'application/json',
                                                                            },
                                                                            body: JSON.stringify(
                                                                                {
                                                                                    questionId:
                                                                                        question.id,
                                                                                    answerId:
                                                                                        optionNum,
                                                                                }
                                                                            ),
                                                                        }
                                                                    );

                                                                    await fetchQuestions(initialRequest.id);
                                                                } catch (error) {
                                                                    console.error(
                                                                        'Error marking answer:',
                                                                        error
                                                                    );
                                                                } finally {
                                                                    setLoadingQuestionId(null);
                                                                    setLoadingAnswerId(null);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {loadingAnswerId === optionNum && loadingQuestionId === question.id ? (
                                                            <Loader2 className="size-4 my-1 animate-spin text-muted-foreground" />
                                                        ) : <QuestionRenderer text={options[optionNum - 1]} type={question.answerType} />}
                                                        
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className='flex gap-3 md:flex-row flex-col'>
                                            {
                                                !question.isAnswered ? (
                                                    <Button
                                                        variant='outline'
                                                        className='w-max'
                                                        disabled={_.isNil(question.userAnswer) || isSubmitting[question.id]}
                                                        onClick={async () => {
                                                            setIsSubmitting(prev => ({ ...prev, [question.id]: true }));
                                                            try {
                                                                const res = await fetch('/api/questions/submit-answer', {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                    },
                                                                    body: JSON.stringify({
                                                                        questionId: question.id
                                                                    }),
                                                                });
                                                                if (res.ok) {
                                                                    await fetchQuestions(initialRequest.id);

                                                                    if (question.correctOption !== question.userAnswer) {
                                                                        const wrongQuestions = questions.filter(q => q.isAnswered && q.correctOption !== q.userAnswer).length;
                                                                        if (wrongQuestions === 3) {
                                                                            toast({
                                                                                title: "Patience is the key 🔑",
                                                                                description: "Use the hint button before submitting the answer if you're stuck.",
                                                                                variant: "default",
                                                                                duration: 10000
                                                                            })
                                                                        }
                                                                    }

                                                                    const { pendingQuestionsForAnswersCount } = await res.json();
                                                                    if (pendingQuestionsForAnswersCount === 0) {
                                                                        toast({
                                                                            title: "All questions answered 🎉",
                                                                            description: "You've answered all the questions. You can now see the answers and explanations.",
                                                                            variant: "default",
                                                                            duration: 10000
                                                                        })
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                console.error('Error submitting answer:', error);
                                                            } finally {
                                                                setIsSubmitting(prev => ({ ...prev, [question.id]: false }));
                                                            }
                                                        }}
                                                    >
                                                        {isSubmitting[question.id] ? <Loader2 className='size-4 animate-spin' /> : (question.userAnswer ? <CheckIcon className='size-4' /> : <HourglassIcon className='size-4' />)}
                                                        {isSubmitting[question.id] ? 'Submitting...' : (question.userAnswer ? 'Submit and show answer' : 'Select an answer to submit')}
                                                    </Button> ) : null
                                            }
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="secondary" className="w-max">
                                                        <LightbulbIcon className="size-4" />
                                                        Show hint
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            <LightbulbIcon className="size-5" />
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <QuestionRenderer text={question.hint || ''} type={question.questionType} />
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </CardContent>
                                {question.isAnswered && (
                                    <CardFooter>
                                        <div className="text-muted-foreground grid gap-4">
                                            <hr />
                                            <div className='flex flex-col gap-0.5'>
                                                <h4 className="text-sm font-medium">Explanation</h4>
                                                <QuestionRenderer small text={question.explanation || 'No explanation provided'} type={question.answerType} />
                                            </div>
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                        ))}

                        {(request.status === RequestStatus.PROCESSING) && (
                            <QuestionSkeleton key={`skeleton-${initialRequest.id}`} />
                        )}
                    </div>
                </div>
                <div className='col-span-3 sm:col-span-1'>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Questions Summary
                            </CardTitle>
                            <CardDescription>
                                Summary will be updated as you answer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {
                                questions.length > 0 ? (
                                    <div className='flex flex-col gap-4'>
                                        {
                                            request.status === RequestStatus.PARTIALLY_CREATED && (
                                                <div className='flex flex-col gap-0.5'>
                                                    <div className='flex flex-row gap-2'>
                                                        <CloudAlert className='size-5' />
                                                        <p className='text-md font-medium'>Partially generated</p>
                                                    </div>
                                                    <div className='flex flex-col gap-2'>
                                                        <p className='text-sm text-muted-foreground'>Uh-ho, our AI was not able to generate all {request.initQuestionsCount} questions requested.</p>
                                                        <p className='text-sm text-muted-foreground'>Don't worry, just refresh this page and we'll generate the remaining {request.initQuestionsCount - questions.length} questions for you.</p>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        <div className='flex flex-col gap-0.5'>
                                            <div className='flex flex-row gap-2'>
                                                <ChartBar className='size-5' />
                                                <p className='text-md font-medium'>Attempt Results</p>
                                            </div>
                                            <div className='flex flex-col'>
                                                <p className='text-sm text-muted-foreground'>Total Questions: {questions.length}</p>
                                                <p className='text-sm text-muted-foreground'>Answered: {questions.filter(question => question.isAnswered).length} ({Math.round(questions.filter(question => question.isAnswered).length / questions.length * 100)}%)</p>
                                                <p className='text-sm text-muted-foreground'>Correct: {questions.filter(question => question.isAnswered && question.correctOption === question.userAnswer).length} ({Math.round(questions.filter(question => question.isAnswered && question.correctOption === question.userAnswer).length / questions.length * 100)}%)</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='flex flex-col gap-3'>
                                        <p className='text-xs italic text-muted-foreground'>No questions generated yet.</p>
                                    </div>
                                )
                            }
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function QuestionRenderer({ text, type, small }: { text: string, type: QuestionType | AnswerType, small?: boolean }) {
    if (type === 'LATEX') {
        return <Latex>{text}</Latex>
    } else if (type === 'CODE') {
        return <code className={small ? 'text-sm' : ''}>{text}</code>
    } else if (type === 'PLAINTEXT') {
        if (text.includes('`') || text.includes('*')) {
            return <div className='prose'>
                <Markdown className={small ? 'text-sm' : ''}>{text}</Markdown>
            </div>
        } else {
            return <p className={small ? 'text-sm' : ''}>{text}</p>
        }
    }
}