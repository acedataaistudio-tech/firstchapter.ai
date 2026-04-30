import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { institutionId } = req.query;

  if (!institutionId || typeof institutionId !== 'string') {
    return res.status(400).json({ error: 'institutionId is required' });
  }

  // GET - Fetch MAU stats
  if (req.method === 'GET') {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const url = `${backendUrl}/api/institution/${institutionId}/mau`;
      
      console.log('Fetching MAU data from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Got MAU data for institution:', institutionId);
      
      return res.status(200).json(data);
      
    } catch (error) {
      console.error('MAU API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({ 
        error: 'Failed to fetch MAU data',
        message: errorMessage,
      });
    }
  }

  // POST - Buy additional users
  if (req.method === 'POST') {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const url = `${backendUrl}/api/institution/${institutionId}/buy-users`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      
      const data = await response.json();
      return res.status(200).json(data);
      
    } catch (error) {
      console.error('Buy users API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({ 
        error: 'Failed to process user purchase',
        message: errorMessage,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
