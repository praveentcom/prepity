import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { Difficulty, RequestStatus } from '@prisma/client';
import { z } from 'zod';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Create request schema
 * This schema is used to validate the request data.
 *
 * @returns The create request schema
 */
const createRequestSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  focusArea: z
    .string()
    .min(1, 'Focus area is required')
    .max(200, 'Focus area must not exceed 200 characters'),
  difficulty: z.nativeEnum(Difficulty).default('MEDIUM'),
  initQuestionsCount: z.number().int().min(1).max(50).default(10),
  requestSlug: z.string().uuid(),
  fileUri: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Create API handler
 *
 * This API handler is used to create a new request.
 * It will create a new request with the given data.
 *
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const result = createRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid request data',
        errors: result.error.flatten().fieldErrors,
      });
    }

    const {
      category,
      focusArea: query,
      difficulty,
      initQuestionsCount,
      requestSlug,
    } = result.data;

    let title: string | null = null;
    try {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Generate a short, concise title (under 60 characters) for practice questions on "${query}" in the category "${category}". 
The title should be descriptive and capture the essence of the topic.
Return ONLY the title text, nothing else. No quotes, no hyphens, no colons or other special characters.`,
      });
      title = text.trim();
    } catch (error) {
      console.error('Error generating title:', error);
    }

    const request = await prisma.request.create({
      data: {
        title,
        category,
        query,
        difficulty,
        initQuestionsCount,
        requestSlug,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        fileUri: result.data.fileUri,
        mimeType: result.data.mimeType,
      },
    });

    return res.status(200).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
