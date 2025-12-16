import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { questionId, star } = req.body;
    if (!questionId || typeof star !== 'boolean') {
      return res.status(400).json({ message: 'Question ID and star status are required' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: { isStarred: star },
    });

    return res.status(200).json({ question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question star status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
