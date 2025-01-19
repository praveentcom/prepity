import type { User } from '@prisma/client'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me')
    if (!response.ok) throw new Error('Not authenticated')
    return response.json()
  } catch (error) {
    console.error('Error getting current user:', error)
    return null;
  }
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  } catch (error) {
    console.error('Logout failed:', error)
  }
} 