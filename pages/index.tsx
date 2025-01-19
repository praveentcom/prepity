'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import GenerateQuestionsForm from '@/components/blocks/forms/generate-questions'
import { useAuth } from '@/providers/auth-provider'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export default function Home() {
  return (
    <AuthenticatedLayout>
        <Content />
    </AuthenticatedLayout>
  )
}

export function Content() {
    const { user } = useAuth()

    return (
        <div className='flex flex-col gap-2'>
            <div className='flex flex-col'>
                <h1 className='text-md font-medium'>Hey, {user?.name}.</h1>
                <p className='text-sm text-muted-foreground'>
                    Good {new Date().getHours() > 12 ? 'afternoon' : 'morning'}, let's learn something new today.
                </p>
            </div>
            <hr className='my-3' />
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <div className='flex flex-col'>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Generate questions to practice
                            </CardTitle>
                            <CardDescription>
                                Choose your category and specify your focus area to generate practice questions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GenerateQuestionsForm />
                        </CardContent>
                        <CardFooter>
                            <p className='text-xs text-muted-foreground'>
                                Questions are generated based on available information from the internet and LLM model ability. Excercise caution when using questions generated and report any issues. Questions generated will be saved in your library.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
