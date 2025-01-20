import { AnswerType, Question, QuestionType, Request, User } from "@prisma/client";
import { z } from "zod";
import { NoObjectGeneratedError, streamObject } from 'ai';
import { createOpenAI } from "@ai-sdk/openai" 
import { prisma } from "../../prisma";

export async function generate({user, request, currentQuestionsCount}: {user: Partial<User>, request: Request, currentQuestionsCount: number}): Promise<Question[]> {
    const questions: Question[] = [];

    if (!user.id) {
        console.error("User ID is missing. Cannot generate questions.");
        return questions;
    }
    
    const { category, query, difficulty, initQuestionsCount } = request;

    if (currentQuestionsCount >= initQuestionsCount) {
        console.error("All questions already generated");
        return questions;
    }

    const questionSchema = z.object({
        question: z.string().describe('The question text. Can include markdown formatting for better readability.'),
        option1: z.string().describe('First option. Can include markdown for formatting mathematical equations, code snippets, or lists.'),
        option2: z.string().describe('Second option. Can include markdown for formatting mathematical equations, code snippets, or lists.'),
        option3: z.string().describe('Third option. Can include markdown for formatting mathematical equations, code snippets, or lists.'),
        option4: z.string().describe('Fourth option. Can include markdown for formatting mathematical equations, code snippets, or lists.'),
        correctOption: z.number().min(1).max(4),
        explanation: z.string().describe('Detailed explanation of the correct answer. Should use markdown for formatting to improve readability.'),
        hint: z.string().describe('A helpful hint that guides the user towards the answer without giving it away. Can include markdown formatting.'),
        questionType: z.enum(Object.values(QuestionType) as [string, ...string[]]).default(QuestionType.PLAINTEXT).describe('Specifies the format of the question.'),
        answerType: z.enum(Object.values(AnswerType) as [string, ...string[]]).default(AnswerType.PLAINTEXT).describe('Specifies the format of the answer options.')
    })

    try {
        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

        var instructionsCount = 0;

        const { elementStream } = streamObject({
            model: openai("gpt-4o"),
            schema: questionSchema,
            schemaName: 'question',
            schemaDescription: 'A high-quality question with 4 options, correct answer, explanation, and hint. All text fields support markdown formatting.',
            output: 'array',
            prompt: `Generate ${initQuestionsCount - currentQuestionsCount} number of ${difficulty.toLowerCase()} difficulty questions about '${query.toLowerCase().replace(/questions (about|on|regarding|concerning|related to|with respect to|in relation to) /, '')}' for the category '${category}'.

Instructions for generating high-quality questions:
${++instructionsCount}. Use markdown formatting to improve readability:
   - Use \`code blocks\` for code snippets
   - Use *italics* and **bold** for emphasis
   - Use mathematical notation when relevant (e.g. $E = mc^2$)
   - Use bullet points and numbered lists where appropriate
${++instructionsCount}. Make questions progressively more challenging within the chosen difficulty level
${++instructionsCount}. Ensure options are distinct and plausible
${++instructionsCount}. Write clear, concise explanations that help understanding
${++instructionsCount}. Include hints that guide thinking without giving away the answer
${++instructionsCount}. Use real-world examples and practical applications where possible
${++instructionsCount}. For code-related questions, include proper syntax highlighting
${++instructionsCount}. Maintain consistent formatting across all questions
${++instructionsCount}. When adding equations, always use LATEX as format name for the type of the question and answer
${++instructionsCount}. It's not necessary for both questionType and answerType to be LATEX, only use it when relevant
${++instructionsCount}. Use the type as CODE when adding code snippets to the question or answer
${++instructionsCount}. For any kind of markdown use, use the type as PLAINTEXT
`
        });

        for await (const element of elementStream) {
            console.log({
                ...element,
                userId: user.id,
                requestId: request.id,
            })
            const question = await prisma.question.create({
                data: {
                    ...element,
                    userId: user.id,
                    requestId: request.id,
                    questionType: element.question.includes('$') ? QuestionType.LATEX : element.questionType as QuestionType,
                    answerType: element.option1.includes('$') || element.option2.includes('$') || element.option3.includes('$') || element.option4.includes('$') ? AnswerType.LATEX : element.answerType as AnswerType,
                },
            });
            questions.push(question);
        }

        return questions;
    } catch (error) {
        console.error('Error generating questions:', error);
        
        if (NoObjectGeneratedError.isInstance(error)) {
            console.log('NoObjectGeneratedError');
            console.log('Cause:', error.cause);
            console.log('Text:', error.text);
            console.log('Response:', error.response);
            console.log('Usage:', error.usage);
        } else {
            console.log('An unexpected error occurred:', error);
        }

        return [];
    }
} 