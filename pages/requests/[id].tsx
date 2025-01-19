import { GetServerSideProps } from 'next';
import { useEffect, useState} from 'react';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { Request, Question, RequestStatus, QuestionType, AnswerType } from '@prisma/client';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckIcon, HourglassIcon, LightbulbIcon } from 'lucide-react';
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
					// First, fetch any new questions
					await fetchQuestions(initialRequest.id);

					// Then check request status
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

		// Start polling if request is in PROCESSING state
		if (
			initialRequest.status === RequestStatus.PROCESSING
		) {
			pollRequestAndQuestions();
		} else {
			fetchQuestions(initialRequest.id);
		}
	}, [router.query]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-medium">{initialRequest.query}</h1>
                    {(request.status === RequestStatus.PROCESSING) && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Generating questions, we're updating them as it's getting ready...
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Category: {CATEGORY_LIST.find(category => 
                        category.category === initialRequest.category
                    )?.categoryName}
                </p>
                {(() => {
                    switch (initialRequest.difficulty) {
                        case 'EASY':
                            return (
                                <p className="text-sm text-muted-foreground">
                                    Difficulty: Easy
                                </p>
                            );
                        case 'MEDIUM':
                            return (
                                <p className="text-sm text-muted-foreground">
                                    Difficulty: Medium
                                </p>
                            );
                        case 'HARD':
                            return (
                                <p className="text-sm text-muted-foreground">
                                    Difficulty: Hard
                                </p>
                            );
                        default:
                            return (
                                <p className="text-sm text-muted-foreground">
                                    Difficulty: {initialRequest.difficulty}
                                </p>
                            );
                    }
                })()}
            </div>
            <hr className="my-3" />
            <div className="grid grid-cols-1 gap-6">
                {questions.map((question, index) => (
                    <div
                        key={`question-${question.id}`}
                        className={`bg-white shadow sm:rounded-lg transition-opacity duration-500 ease-in-out opacity-100`}>
                        <div className="px-4 pt-5 pb-6 sm:px-6 flex flex-col gap-5">
                            <div className='flex flex-col gap-0.5'>
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Question {index + 1}
                                </h4>
                                <QuestionRenderer text={question.question} type={question.questionType} />
                            </div>
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
                                            disabled={question.isAnswered}
                                            onClick={async () => {
                                                if (!question.isAnswered) {
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
                                                        // Refresh questions after marking answer
                                                        await fetchQuestions(initialRequest.id);
                                                    } catch (error) {
                                                        console.error(
                                                            'Error marking answer:',
                                                            error
                                                        );
                                                    }
                                                }
                                            }}
                                        >
                                            <QuestionRenderer text={options[optionNum - 1]} type={question.answerType} />
                                        </button>
                                    );
                                })}
                            </div>
                            <div className='flex gap-3'>
                                {
                                    !question.isAnswered ? (
                                        <Button
                                            variant='outline'
                                            className='w-max'
                                            disabled={_.isNil(question.userAnswer)}
                                            onClick={async () => {
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

                                                        const { pendingQuestionsForAnswersCount } = await res.json();

                                                        if (pendingQuestionsForAnswersCount === 0) {

                                                        }

                                                        toast({
                                                            title: "Scheduled: Catch up",
                                                            description: "Friday, February 10, 2023 at 5:57 PM",
                                                        })
                                                    }
                                                } catch (error) {
                                                    console.error('Error submitting answer:', error);
                                                }
                                            }}
                                        >
                                            {question.userAnswer ? <CheckIcon className='size-4' /> : <HourglassIcon className='size-4' />}
                                            {question.userAnswer ? 'Submit and show answer' : 'Select an answer to submit'}
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
                                        <p className='antialiased'>{question.hint}</p>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {question.isAnswered && (
                                <div className="text-muted-foreground grid gap-4">
                                    <hr />
                                    <div className='flex flex-col gap-0.5'>
                                        <h4 className="text-sm font-medium">Explanation</h4>
                                        <QuestionRenderer text={question.explanation || 'No explanation provided'} type={question.answerType} />
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                ))}

                {/* Show skeleton loaders while processing */}
                {(request.status === RequestStatus.PROCESSING) && (
                    <QuestionSkeleton key={`skeleton-${initialRequest.id}`} />
                )}
            </div>
        </div>
    )
}

function QuestionRenderer({ text, type }: { text: string, type: QuestionType | AnswerType }) {
    if (type === 'LATEX') {
        return <Latex>{text}</Latex>
    } else if (type === 'CODE') {
        return <code>{text}</code>
    } else if (type === 'PLAINTEXT') {
        if (text.includes('`') || text.includes('*')) {
            return <div className='prose'>
                <Markdown>{text}</Markdown>
            </div>
        } else {
            return <p>{text}</p>
        }
    }
}