import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment details',
        details: 'order_id, payment_id, and signature are required'
      });
    }

    // Verify signature
    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
    
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment verification failed',
        details: 'Invalid signature'
      });
    }

    // Signature is valid
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error.message 
    });
  }
}
