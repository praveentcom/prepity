import { prisma } from '@/lib/server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { helpers } from '@/lib/server/helpers';
import { RequestStatus } from '@prisma/client';
import { waitUntil } from '@vercel/functions';

/**
 * Retry API handler
 *
 * This API handler is used to retry a request that is stuck in a processing state.
 * It will reset the status to PROCESSING and start the generation again.
 *
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    const request = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    /**
     * Only allow retry if status is PROCESSING (stuck) or PARTIALLY_CREATED or FAILED
     */
    const retryableStatuses: RequestStatus[] = [
      RequestStatus.PROCESSING,
      RequestStatus.PARTIALLY_CREATED,
      RequestStatus.FAILED,
    ];
    if (!retryableStatuses.includes(request.status)) {
      return res.status(400).json({
        message: 'Request cannot be retried in current status',
      });
    }

    /**
     * Reset status to PROCESSING to start generation
     */
    await prisma.request.update({
      where: { id: request.id },
      data: { status: RequestStatus.PROCESSING },
    });

    const currentQuestionsCount = await prisma.question.count({
      where: { requestId: request.id },
    });

    const backgroundTask = helpers.questions
      .generate({ request, currentQuestionsCount })
      .execute()
      .then(async (questions) => {
        const newQuestionsCount = questions.length;

        if (
          newQuestionsCount + currentQuestionsCount >=
          request.initQuestionsCount
        ) {
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

    waitUntil(backgroundTask);

    return res.status(200).json({ message: 'Retry started' });
  } catch (error) {
    console.error('Error retrying request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
