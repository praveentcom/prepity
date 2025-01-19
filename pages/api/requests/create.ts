import { getSession } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { Difficulty, RequestStatus } from '@prisma/client';
import { z } from 'zod';

const createRequestSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  focusArea: z.string().min(1, 'Focus area is required').max(200, 'Focus area must not exceed 200 characters'),
  difficulty: z.nativeEnum(Difficulty).default('MEDIUM'),
  initQuestionsCount: z.number().min(1).max(50).default(10),
  requestSlug: z.string().uuid(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getSession(req)
    if (!user?.id) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const result = createRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: result.error.flatten().fieldErrors 
      });
    }

    const { category, focusArea: query, difficulty, initQuestionsCount, requestSlug } = result.data;

    const request = await prisma.request.create({
      data: {
        userId: user.id,
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