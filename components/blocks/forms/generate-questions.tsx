import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import router from "next/router";
import { CATEGORY_LIST } from "@/lib/client/constants";

const generateQuestionsSchema = z.object({
    category: z.string({
        required_error: "Please select a category",
    }).refine((value) => CATEGORY_LIST.some((category) => category.category === value), {
        message: "Invalid category",
    }),
    focusArea: z.string({
        required_error: "Please enter a focus area",
    }).min(10, {
        message: "Focus area must be at least 10 characters long",
    }).max(200, { message: "Focus area must not exceed 200 characters" }),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD'], {
        required_error: "Please select a difficulty level",
    }).default('MEDIUM'),
    initQuestionsCount: z.number({
        required_error: "Please enter number of questions",
    }).min(1).max(50).default(10),
});

export default function GenerateQuestionsForm() {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof generateQuestionsSchema>>({
        resolver: zodResolver(generateQuestionsSchema),
    })
    
    const selectedCategory = form.watch('category')
     
    async function onSubmit(data: z.infer<typeof generateQuestionsSchema>) {
        try {
            setIsLoading(true)
            const response = await axios.post('/api/requests/create', {
                ...data,
                requestSlug: uuidv4()
            })
            router.push(`/requests/${response.data.requestSlug}`)
        } catch (error) {
            console.error('Error creating request:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {CATEGORY_LIST.map((category) => (
                                        <SelectItem key={category.category} value={category.category}>
                                            {category.categoryName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Choose the category of questions you want to generate.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="focusArea"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Focus Area</FormLabel>
                            <Textarea 
                                placeholder={CATEGORY_LIST.find(category => 
                                    category.category === selectedCategory
                                )?.placeholder || 'Questions about...'}
                                {...field}
                            />
                            <FormDescription>
                                Enter the focus area of the questions you want to generate. Be specific and add details about the exam level, course, etc. Similarly, for interview questions, add details about the role, company, etc.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="difficulty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Difficulty Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select difficulty" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="EASY">Easy</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HARD">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Choose the difficulty level of questions.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="initQuestionsCount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Questions</FormLabel>
                                <FormControl>
                                    <Select 
                                        onValueChange={(value) => field.onChange(parseInt(value))} 
                                        defaultValue={field.value?.toString()}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select number of questions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                                                <SelectItem key={num} value={num.toString()}>
                                                    {num} questions {num === 10 ? ' (recommended)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormDescription>
                                    Choose how many questions to generate.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin" />}
                    {isLoading ? 'Generating...' : 'Generate'}
                </Button>
            </form>
        </Form>
    )
}