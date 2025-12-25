import type { NextApiRequest, NextApiResponse } from 'next';

const CACHE = new Map<string, string>();

async function fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    if (response.status === 503 || response.status === 500) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
    }
    return response;
  } catch (error: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (CACHE.has(content)) {
    return res.status(200).json({ url: CACHE.get(content) });
  }

  try {
    const params = new URLSearchParams();
    params.append('formula', `\\chemfig{${content}}`);
    params.append('fsize', '40px');
    params.append('fcolor', '000000');
    params.append('mode', '1');
    params.append('out', '1');
    params.append('remhost', 'quicklatex.com');
    params.append('preamble', '\\usepackage{chemfig}');

    const response = await fetchWithRetry('https://quicklatex.com/latex3.f', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`QuickLaTeX responded with ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    if (lines[0].trim() !== '0') {
      throw new Error(`QuickLaTeX error: ${text}`);
    }

    const match = lines[1]?.match(/(https:\/\/quicklatex\.com\/cache3\/[^\s]+)/);
    const imageUrl = match ? match[1] : null;

    if (!imageUrl) {
      throw new Error('Failed to parse image URL from QuickLaTeX response');
    }

    CACHE.set(content, imageUrl);
    res.status(200).json({ url: imageUrl });
  } catch (error: any) {
    console.error('Chemistry rendering error:', error);
    res.status(503).json({ error: 'Chemistry rendering service is temporarily unavailable. Please try again later.' });
  }
}
