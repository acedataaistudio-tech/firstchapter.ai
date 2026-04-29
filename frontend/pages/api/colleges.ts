import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search } = req.query;
    
    // Build backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = search 
      ? `${backendUrl}/api/colleges?search=${search}`
      : `${backendUrl}/api/colleges`;
    
    console.log('Fetching from:', url); // Debug log
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Got colleges:', data.colleges?.length || 0); // Debug log
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Colleges API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch colleges',
      message: error.message,
      colleges: []
    });
  }
}