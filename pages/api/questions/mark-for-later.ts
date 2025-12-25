import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Mark for Later API handler
 *
 * This API handler is used to toggle the mark for later status of a question.
 *
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { questionId, marked } = req.body;
    if (!questionId || typeof marked !== 'boolean') {
      return res
        .status(400)
        .json({ message: 'Question ID and marked status are required' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { isMarkedForLater: marked },
    });

    return res.status(200).json({ question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question mark for later status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
