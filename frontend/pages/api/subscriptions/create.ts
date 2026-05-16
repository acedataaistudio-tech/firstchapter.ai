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
    // Frontend sends BOTH camelCase (legacy) and snake_case (canonical).
    // Accept either format here so we don't break old code paths.
    const userId      = req.body.user_id      ?? req.body.userId;
    const packageId   = req.body.package_id   ?? req.body.packageId;
    const paymentId   = req.body.payment_id   ?? req.body.paymentId;
    const email       = req.body.email        ?? null;
    const fullName    = req.body.full_name    ?? req.body.fullName    ?? null;

    if (!userId || !packageId) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId and packageId are required',
      });
    }

    // Forward ALL fields to the backend — previously email/full_name were
    // dropped here, which caused the backend to fall back to email="" and
    // hit a UNIQUE constraint collision, silently failing the user-row
    // insert and leaving every Free signup without access.
    const response = await fetch(`${backendUrl}/api/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        user_id:    userId,
        package_id: packageId,
        payment_id: paymentId || null,
        email:      email,
        full_name:  fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Backend returned ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    return res.status(500).json({
      error: 'Failed to create subscription',
      details: error.message,
    });
  }
}
