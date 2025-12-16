import { Request } from '@prisma/client';

export async function fetchRequests(limit: number): Promise<Request[]> {
  try {
    const response = await fetch(`/api/requests/list?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch requests');
    const data = await response.json();
    return data?.requests as Request[];
  } catch (error) {
    console.error('Error fetching requests:', error);
    return [];
  }
}

export async function deleteRequest(requestSlug: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/requests/delete?requestSlug=${requestSlug}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) throw new Error('Failed to delete request');
    return true;
  } catch (error) {
    console.error('Error deleting request:', error);
    return false;
  }
}
