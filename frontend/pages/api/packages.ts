import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type } = req.query; // 'individual' or 'institution'
    
    // Build backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const url = type 
      ? `${backendUrl}/api/packages?type=${type}`
      : `${backendUrl}/api/packages`;
    
    console.log('Fetching packages from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Got packages:', data.packages?.length || 0);
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Packages API error:', error);
    
    // TypeScript-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({ 
      error: 'Failed to fetch packages',
      message: errorMessage,
      packages: []
    });
  }
}
