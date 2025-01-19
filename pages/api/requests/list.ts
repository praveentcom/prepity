import { getSession } from '@/lib/server/auth';
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
    const user = await getSession(req);
    if (!user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const requests = await prisma.request.findMany({
      where: { userId: user.id },
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: { createdAt: 'desc' },
    });

    const totalRequests = await prisma.request.count({
      where: { userId: user.id },
    });

    return res.status(200).json({
      requests,
      totalPages: Math.ceil(totalRequests / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error('Error listing requests:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 