import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Mark answer API handler
 *
 * This API handler is used to mark an answer for a question.
 * It will update the user answer of the question.
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
    const { questionId, answerId } = req.body;
    if (!questionId || !answerId) {
      return res
        .status(400)
        .json({ message: 'Question ID and Answer ID are required' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (question?.isAnswered) {
      return res
        .status(400)
        .json({ message: 'Question has already been answered' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { userAnswer: answerId },
    });

    return res.status(200).json({ question: updatedQuestion });
  } catch (error) {
    console.error('Error marking answer on question:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
