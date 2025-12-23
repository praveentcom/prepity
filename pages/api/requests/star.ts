import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Star API handler
 *
 * This API handler is used to toggle the star status of a request.
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
    const { requestSlug } = req.body;
    if (!requestSlug) {
      return res.status(400).json({ message: 'Request slug is required' });
    }

    const request = await prisma.request.findFirst({
      where: { requestSlug },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: request.id },
      data: { isStarred: !request.isStarred },
    });

    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error toggling star status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
