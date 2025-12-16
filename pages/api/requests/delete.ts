import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { requestSlug } = req.query;
    if (!requestSlug || typeof requestSlug !== 'string') {
      return res.status(400).json({ message: 'Request slug is required' });
    }

    const request = await prisma.request.findFirst({
      where: { requestSlug },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    await prisma.request.delete({
      where: { id: request.id },
    });

    return res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
