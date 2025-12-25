import { Question, Request } from '@prisma/client';
import { z } from 'zod';
import { NoObjectGeneratedError, streamObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { prisma } from '../../prisma';

function getPrompt({
  count,
  chunkIndex,
  totalChunks,
  difficulty,
  query,
  category,
  isFileRequest,
}: {
  count: number;
  chunkIndex: number;
  totalChunks: number;
  difficulty: string;
  query: string;
  category: string;
  isFileRequest?: boolean;
}) {
  const citationPrompt = isFileRequest
    ? `
<citation_guidelines>
- CITATION: For each question, provide a citation blob that references where the question content is derived from in the provided document.
- CONTENT: Include the specific text or concept from the PDF that the question is based on.
- REFERENCE: Mention the section, page number (if available), or location in the document.
</citation_guidelines>`
    : '';

  return `You are an expert educational content creator specializing in creating high-quality assessment questions. Generate ${count} ${difficulty.toLowerCase()} difficulty multiple-choice questions about '${query.toLowerCase().replace(/questions (about|on|regarding|concerning|related to|with respect to|in relation to) /, '')}' for the category '${category}'.${citationPrompt}

<chunk_diversity>
You are generating chunk ${chunkIndex + 1} of ${totalChunks} parallel batches. To ensure NO DUPLICATE or SIMILAR questions across batches:
- Focus on UNIQUE sub-topics, scenarios, and angles not likely covered by other chunks
- Chunk 1: Focus on foundational concepts and definitions
- Chunk 2: Focus on practical applications and real-world scenarios
- Chunk 3: Focus on edge cases, comparisons, and contrasts
- Chunk 4: Focus on problem-solving and debugging scenarios
- Chunk 5: Focus on advanced concepts and integration topics
- Use DISTINCT examples, code snippets, and scenarios from other potential chunks
- Vary the question structure (what/why/how/when/which)
</chunk_diversity>


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
- MATHEMATICAL NOTATION: Use LaTeX for equations (e.g., $E = mc^2$, $\\int_0^\\infty e^{-x} dx$) for expressions needed for science questions
- CODE PRESENTATION: Include proper syntax highlighting and ensure code is runnable or clearly pseudocode
</formatting>

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
- CITATIONS: If a reference document is provided, ensure the citation field is populated with the source context
</quality_assurance>
`;
}

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


  const targetCount = initQuestionsCount - currentQuestionsCount;
  const CONCURRENCY_LIMIT = 5;
  const CHUNK_SIZE = Math.ceil(targetCount / CONCURRENCY_LIMIT);

  const chunks = Array.from({ length: CONCURRENCY_LIMIT }, (_, i) => {
    const remaining = targetCount - i * CHUNK_SIZE;
    return remaining > 0 ? Math.min(remaining, CHUNK_SIZE) : 0;
  }).filter((count) => count > 0);

  try {
    let model: any;
    let isFileRequest = false;

    if (request.fileUri && request.mimeType) {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
      model = google('gemini-3-pro-preview');
      isFileRequest = true;
    } else {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      model = openai('gpt-5.2');
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
    ...(isFileRequest && {
      citation: z
        .string()
        .describe(
          'Citation blob text explaining where in the source document this question was derived from.'
        ),
    }),
  });

    const generateChunk = async (
      count: number,
      chunkIndex: number,
      totalChunks: number
    ) => {
      const prompt = getPrompt({
        count,
        chunkIndex,
        totalChunks,
        difficulty,
        query,
        category,
        isFileRequest,
      });

      let messages: any[] = [];
      if (isFileRequest && request.fileUri && request.mimeType) {
        messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'file',
                data: request.fileUri,
                mediaType: request.mimeType,
              },
            ],
          },
        ];
      } else {
        messages = [{ role: 'user', content: prompt }];
      }

      const { elementStream } = streamObject({
        model,
        schema: questionSchema,
        schemaName: 'question',
        schemaDescription:
          'A high-quality question with 4 options, correct answer, explanation, and two progressive hints. All text fields support markdown formatting.',
        output: 'array',
        messages,
      });

      for await (const element of elementStream) {
        const question = await prisma.question.create({
          data: {
            ...element,
            requestId: request.id
          },
        });
        questions.push(question);
      }
    };

    await Promise.all(
      chunks.map((count, index) => generateChunk(count, index, chunks.length))
    );

    return questions;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('NoObjectGeneratedError', {
        cause: error.cause,
        text: error.text,
        response: error.response,
        usage: error.usage,
      });
    } else {
      console.error('An unexpected error occurred:', error);
    }

    return questions;
  }
}
