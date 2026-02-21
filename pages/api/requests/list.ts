import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * List API handler
 *
 * This API handler is used to list all requests.
 * It will return a paginated list of requests.
 *
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: 'Invalid page number' });
    }
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ message: 'Invalid limit (must be 1-100)' });
    }

    const requests = await prisma.request.findMany({
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: { createdAt: 'desc' },
    });

    const totalRequests = await prisma.request.count();

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
