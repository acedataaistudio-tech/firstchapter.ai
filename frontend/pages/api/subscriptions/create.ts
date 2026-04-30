import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  
  try {
    const { userId, packageId, paymentId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'userId and packageId are required'
      });
    }

    const response = await fetch(`${backendUrl}/api/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        user_id: userId,
        package_id: packageId,
        payment_id: paymentId || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Backend returned ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message 
    });
  }
}
