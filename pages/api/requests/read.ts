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

    const { requestSlug, id } = req.query;
    
    if (!requestSlug && !id) {
      return res.status(400).json({ message: 'Request ID or slug is required' });
    }

    const request = await prisma.request.findFirst({
      where: {
        ...(id ? { id: parseInt(id as string) } : { requestSlug: requestSlug as string }),
        OR: [
          { userId: user.id },
          { visibility: 'PUBLIC' }
        ],
      },
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