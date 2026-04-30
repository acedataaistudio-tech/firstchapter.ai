import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, packageId, packageName, userId } = req.body;

    if (!amount || !packageId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'amount, packageId, and userId are required'
      });
    }

    // Initialize Razorpay (keys should be in Vercel env vars)
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    // Create Razorpay order
    const options = {
      amount: amount, // amount in paise (already from package)
      currency: 'INR',
      receipt: `sub_${packageId}_${userId}_${Date.now()}`,
      notes: {
        package_id: packageId,
        package_name: packageName || 'Subscription',
        user_id: userId,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.message 
    });
  }
}
