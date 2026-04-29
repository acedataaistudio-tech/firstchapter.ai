import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch from your Python backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/colleges`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch colleges');
    }
    
    const data = await response.json();
    
    // Return colleges with proper structure
    res.status(200).json({
      colleges: data.colleges || data, // Handle different response formats
    });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ 
      error: 'Failed to fetch colleges',
      colleges: [] 
    });
  }
}