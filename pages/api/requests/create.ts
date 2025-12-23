import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { Difficulty, RequestStatus } from '@prisma/client';
import { z } from 'zod';

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
  initQuestionsCount: z.number().min(1).max(50).default(10),
  requestSlug: z.string().uuid(),
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

    const request = await prisma.request.create({
      data: {
        category,
        query,
        difficulty,
        initQuestionsCount,
        requestSlug,
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json(request);
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
