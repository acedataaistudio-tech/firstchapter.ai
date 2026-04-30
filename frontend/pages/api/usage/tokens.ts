import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, days } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Build backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const daysParam = days || '30';
    const url = `${backendUrl}/api/usage/tokens?user_id=${user_id}&days=${daysParam}`;
    
    console.log('Fetching token usage from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Got token usage data for user:', user_id);
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Token usage API error:', error);
    
    // TypeScript-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({ 
      error: 'Failed to fetch token usage',
      message: errorMessage,
      total_tokens: 0,
      query_count: 0,
    });
  }
}
