import { getSession } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { helpers } from '@/lib/server/helpers';
import { RequestStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getSession(req);
    if (!user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    // Get the request
    const request = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update status to PROCESSING
    await prisma.request.update({
      where: { id: request.id },
      data: { status: RequestStatus.PROCESSING },
    });

    // Start processing in the background
    // Note: This is not waiting for completion
    const currentQuestionsCount = await prisma.question.count({
      where: { requestId: request.id },
    });

    helpers.questions.generate({ user, request, currentQuestionsCount: currentQuestionsCount }).execute()
      .then(async (questions) => {
        const newQuestionsCount = questions.length;

        if (newQuestionsCount + currentQuestionsCount >= request.initQuestionsCount) {
          await prisma.request.update({
            where: { id: request.id },
            data: { status: RequestStatus.CREATED },
          });
        } else if (newQuestionsCount + currentQuestionsCount > 0) {
            await prisma.request.update({
                where: { id: request.id },
                data: { status: RequestStatus.PARTIALLY_CREATED },
            });
        } else {
          await prisma.request.update({
            where: { id: request.id },
            data: { status: RequestStatus.FAILED },
          });
        }
      })
      .catch(async (error) => {
        console.error('Error generating questions:', error);
        await prisma.request.update({
          where: { id: request.id },
          data: { status: RequestStatus.FAILED },
        });
      });

    // Return immediately while processing continues in background
    return res.status(200).json({ message: 'Processing started' });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 