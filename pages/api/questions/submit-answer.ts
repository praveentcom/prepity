import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { questionId } = req.body;
    if (!questionId) {
      return res.status(400).json({ message: 'Question ID is required' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!question.userAnswer) {
      return res.status(400).json({ message: 'No answer selected' });
    }

    if (question.isAnswered) {
      return res.status(400).json({ message: 'Question has already been answered' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { isAnswered: true, answeredAt: new Date() },
    });

    const pendingQuestionsForAnswersCount = await prisma.question.count({
      where: {
        isAnswered: false,
        requestId: question.requestId,
      },
    });

    return res.status(200).json({ question: updatedQuestion, pendingQuestionsForAnswersCount });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
