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
    const { requestSlug, id } = req.query;

    if (!requestSlug && !id) {
      return res
        .status(400)
        .json({ message: 'Request ID or slug is required' });
    }

    const request = await prisma.request.findFirst({
      where: id
        ? { id: parseInt(id as string) }
        : { requestSlug: requestSlug as string },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    return res.status(200).json({ request });
  } catch (error) {
    console.error('Error reading request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
