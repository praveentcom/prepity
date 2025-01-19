import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from '@/lib/server/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const user = await getSession(req)
    if (!user?.id) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    return res.status(200).json(user)
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' })
  }
} 