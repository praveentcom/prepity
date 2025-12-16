import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { requestId } = req.query;
    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    const requestIdNumber = parseInt(requestId as string, 10);
    if (isNaN(requestIdNumber)) {
      return res.status(400).json({ message: 'Invalid Request ID' });
    }

    const questions = await prisma.question.findMany({
      where: { requestId: requestIdNumber },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({ questions });
  } catch (error) {
    console.error('Error listing questions:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
