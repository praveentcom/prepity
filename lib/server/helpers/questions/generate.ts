import { AnswerType, Question, QuestionType, Request } from '@prisma/client';
import { z } from 'zod';
import { NoObjectGeneratedError, streamObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { prisma } from '../../prisma';

export async function generate({
  request,
  currentQuestionsCount,
}: {
  request: Request;
  currentQuestionsCount: number;
}): Promise<Question[]> {
  const questions: Question[] = [];

  const { category, query, difficulty, initQuestionsCount } = request;

  if (currentQuestionsCount >= initQuestionsCount) {
    console.error('All questions already generated');
    return questions;
  }

  const questionSchema = z.object({
    question: z
      .string()
      .describe(
        'The question text. Can include markdown formatting for better readability.'
      ),
    option1: z
      .string()
      .describe(
        'First option. Can include markdown for formatting mathematical equations, code snippets, or lists.'
      ),
    option2: z
      .string()
      .describe(
        'Second option. Can include markdown for formatting mathematical equations, code snippets, or lists.'
      ),
    option3: z
      .string()
      .describe(
        'Third option. Can include markdown for formatting mathematical equations, code snippets, or lists.'
      ),
    option4: z
      .string()
      .describe(
        'Fourth option. Can include markdown for formatting mathematical equations, code snippets, or lists.'
      ),
    correctOption: z.number().min(1).max(4),
    explanation: z
      .string()
      .describe(
        'Detailed explanation of the correct answer. Should use markdown for formatting to improve readability.'
      ),
    hint: z
      .string()
      .describe(
        'First hint that provides strategic direction without revealing the answer. Can include markdown formatting.'
      ),
    hint2: z
      .string()
      .describe(
        'Second hint that is more comprehensive and guides the user closer to the answer, making it easier. Can include markdown formatting.'
      ),
    questionType: z
      .enum(Object.values(QuestionType) as [string, ...string[]])
      .default(QuestionType.PLAINTEXT)
      .describe('Specifies the format of the question.'),
    answerType: z
      .enum(Object.values(AnswerType) as [string, ...string[]])
      .default(AnswerType.PLAINTEXT)
      .describe('Specifies the format of the answer options.'),
  });

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { elementStream } = streamObject({
      model: openai('gpt-5.2'),
      schema: questionSchema,
      schemaName: 'question',
      schemaDescription:
        'A high-quality question with 4 options, correct answer, explanation, and two progressive hints. All text fields support markdown formatting.',
      output: 'array',
      prompt: `You are an expert educational content creator specializing in creating high-quality assessment questions. Generate ${initQuestionsCount - currentQuestionsCount} ${difficulty.toLowerCase()} difficulty multiple-choice questions about '${query.toLowerCase().replace(/questions (about|on|regarding|concerning|related to|with respect to|in relation to) /, '')}' for the category '${category}'.

<difficulty_guidelines>
- EASY: Test fundamental concepts, definitions, and basic recall. Focus on recognition and comprehension.
- MEDIUM: Require application of concepts, analysis of scenarios, and connecting multiple ideas. Test understanding and problem-solving.
- HARD: Demand synthesis, evaluation, and critical thinking. Include edge cases, complex scenarios, and multi-step reasoning.
</difficulty_guidelines>

<question_design>
- COGNITIVE DEPTH: Questions should progress through Bloom's Taxonomy levels appropriate to difficulty:
  * Easy: Remember, Understand
  * Medium: Apply, Analyze
  * Hard: Evaluate, Create
- CLARITY & PRECISION: Write unambiguous questions that test specific knowledge points. Avoid trick questions or unnecessarily complex language.
- REAL-WORLD RELEVANCE: Connect to practical applications, industry scenarios, or authentic contexts whenever possible.
- DISTRACTOR QUALITY: All incorrect options must be plausible and reflect common misconceptions or partial understanding. Avoid obviously wrong answers.
- QUESTION STEM: Ensure the question can stand alone without the options. Present a clear problem or scenario.
- AVOID BIAS: Ensure questions are fair, culturally neutral, and don't include irrelevant difficulty factors.
</question_design>

<formatting>
- MARKDOWN USAGE: Leverage markdown for enhanced readability:
  * Use \`inline code\` for short code elements, variables, functions, commands
  * Use \`\`\`language blocks\`\`\` for multi-line code with proper syntax highlighting
  * Use **bold** for key terms and *italics* for emphasis
  * Use > blockquotes for scenarios, requirements, or important context
  * Use bullet points (-, *) or numbered lists (1., 2.) for structured information
  * Use | tables | when comparing features or organizing data
- MATHEMATICAL NOTATION: Use LaTeX for equations (e.g., $E = mc^2$, $\\int_0^\\infty e^{-x} dx$)
- CODE PRESENTATION: Include proper syntax highlighting and ensure code is runnable or clearly pseudocode
</formatting>

<content_types>
- Set questionType to LATEX when the question itself contains mathematical equations or formulas
- Set answerType to LATEX when any answer option contains mathematical equations or formulas
- Set questionType to CODE when the question presents a code snippet to analyze
- Set answerType to CODE when answer options are code blocks or code snippets
- Use PLAINTEXT for general text, markdown formatting, and non-specialized content
- It's not necessary for both questionType and answerType to match - set them independently based on content
</content_types>

<explanations>
- START WITH THE ANSWER: Begin by clearly stating why the correct option is right
- EXPLAIN DISTRACTORS: Briefly address why each incorrect option is wrong or what misconception it represents
- TEACH THE CONCEPT: Provide additional context, rules, or principles that help deepen understanding
- USE EXAMPLES: Include relevant examples or analogies to solidify comprehension
- KEEP IT STRUCTURED: Use headers, lists, or clear paragraphs for easy scanning
</explanations>

<hints>
FIRST HINT (hint):
- GUIDE, DON'T REVEAL: Provide strategic direction without giving away the answer
- FOCUS ON APPROACH: Suggest a thinking strategy, relevant concept, or elimination method
- BE SPECIFIC ENOUGH: Offer more than vague encouragement - point to a concrete starting point
- EXAMPLES: "Consider what happens to memory allocation in this scenario" or "Think about the time complexity of nested loops"

SECOND HINT (hint2):
- MORE COMPREHENSIVE: Build upon the first hint with more detailed guidance
- NARROW DOWN OPTIONS: Help eliminate incorrect answers or point to key distinguishing factors
- CLOSER TO ANSWER: Provide more specific direction that makes solving easier, but still requires thinking
- BRIDGE THE GAP: If the first hint points to a concept, the second hint should explain how to apply it
- EXAMPLES: "In this scenario, automatic variables are stored on the stack, which gets deallocated when the function returns" or "Nested loops create O(n²) complexity - count how many times the inner loop executes"
</hints>

<quality_assurance>
- PROGRESSION: Make questions progressively more challenging within the difficulty level
- DIVERSITY: Vary question formats - scenarios, code analysis, theoretical concepts, practical problems
- CONSISTENCY: Maintain uniform formatting and quality standards across all questions
- ACCURACY: Ensure technical correctness and up-to-date information
- COMPLETENESS: Every question must have exactly 4 options, 1 correct answer, detailed explanation, and two progressive hints
</quality_assurance>
`,
    });

    for await (const element of elementStream) {
      console.log({
        ...element,
        requestId: request.id,
      });
      const question = await prisma.question.create({
        data: {
          ...element,
          requestId: request.id,
          questionType: element.question.includes('$')
            ? QuestionType.LATEX
            : (element.questionType as QuestionType),
          answerType:
            element.option1.includes('$') ||
            element.option2.includes('$') ||
            element.option3.includes('$') ||
            element.option4.includes('$')
              ? AnswerType.LATEX
              : (element.answerType as AnswerType),
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
