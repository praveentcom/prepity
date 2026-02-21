import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Read API handler
 *
 * This API handler is used to read a request by its ID or slug.
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
    const { requestSlug, id } = req.query;

    if (!requestSlug && !id) {
      return res
        .status(400)
        .json({ message: 'Request ID or slug is required' });
    }

    let parsedId: number | undefined;
    if (id) {
      parsedId = parseInt(id as string, 10);
      if (isNaN(parsedId)) {
        return res.status(400).json({ message: 'Invalid Request ID' });
      }
    }

    const request = await prisma.request.findFirst({
      where: parsedId
        ? { id: parsedId }
        : { requestSlug: requestSlug as string },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const questions = await prisma.question.findMany({
      where: { requestId: request.id },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({ request, questions });
  } catch (error) {
    console.error('Error reading request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
