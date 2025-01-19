import { NextApiRequest, NextApiResponse } from 'next'
import { sign, verify } from 'jsonwebtoken'
import { User } from '@prisma/client'
import { serialize } from 'cookie'
import { prisma } from '../prisma'

const JWT_SECRET = process.env.JWT_SECRET || ''

export async function getSession(req: NextApiRequest): Promise<Partial<User> | null> {
  try {
    const token = req.cookies.token

    if (!token) {
      return null
    }

    // Verify the JWT token
    const decoded = verify(token, JWT_SECRET) as { id: string }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      }
    })

    return user
  } catch (error) {
    return null
  }
}

export async function clearSession(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Clear the token cookie
  res.setHeader(
    'Set-Cookie',
    serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Set expiry to the past to delete the cookie
    })
  )
}

export async function setSession(res: NextApiResponse, userId: string): Promise<void> {
  const token = sign({ id: userId }, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  })

  res.setHeader(
    'Set-Cookie',
    serialize('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  )
} 