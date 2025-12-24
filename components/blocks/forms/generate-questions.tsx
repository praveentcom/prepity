import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import router from 'next/router';
import { CATEGORY_LIST } from '@/lib/client/constants';
import { useRequests } from '@/lib/client/contexts/requests-context';

const generateQuestionsSchema = z.object({
  category: z
    .string({ error: 'Please select a category' })
    .min(1, { message: 'Please select a category' })
    .refine(
      (value) => CATEGORY_LIST.some((category) => category.category === value),
      {
        message: 'Invalid category',
      }
    ),
  focusArea: z
    .string({ error: 'Please enter a focus area' })
    .min(10, { message: 'Focus area must be at least 10 characters long' })
    .max(200, { message: 'Focus area must not exceed 200 characters' }),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD'], {
    error: 'Please select a difficulty level',
  }),
  initQuestionsCount: z
    .number({ error: 'Please enter number of questions' })
    .min(1)
    .max(50),
});

const CATEGORY_GROUPS = [...new Set(CATEGORY_LIST.map((c) => c.group))];

export default function GenerateQuestionsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('Interviews');
  const { refreshRequests } = useRequests();

  const form = useForm<z.infer<typeof generateQuestionsSchema>>({
    resolver: zodResolver(generateQuestionsSchema),
    defaultValues: {
      category: 'software-engineering',
      focusArea: '',
      difficulty: 'MEDIUM',
      initQuestionsCount: 10,
    },
  });

  const selectedCategory = form.watch('category');

  const filteredCategories = selectedGroup
    ? CATEGORY_LIST.filter((c) => c.group === selectedGroup)
    : [];

  async function onSubmit(data: z.infer<typeof generateQuestionsSchema>) {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/requests/create', {
        ...data,
        requestSlug: uuidv4(),
      });
      await refreshRequests();
      router.push(`/requests/${response.data.requestSlug}`);
    } catch (error) {
      console.error('Error creating request:', error);
      setIsLoading(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select
              value={selectedGroup}
              onValueChange={(value) => {
                setSelectedGroup(value);
                form.setValue('category', '');
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CATEGORY_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>What are you preparing for?</FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedGroup}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedGroup
                            ? 'Select category'
                            : 'Select type first'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem
                        key={category.category}
                        value={category.category}
                      >
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Choose the specific category.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="focusArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Focus Area</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    CATEGORY_LIST.find(
                      (category) => category.category === selectedCategory
                    )?.placeholder || 'Questions about...'
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the focus area of the questions you want to generate. Be
                specific and add details about the exam level, course, etc.
                Similarly, for interview questions, add details about the role,
                company, etc.
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                <FormLabel>Questions Count</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number of questions" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </FormProvider>
  );
}
