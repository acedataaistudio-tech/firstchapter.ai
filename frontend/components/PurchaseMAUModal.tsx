import { useState } from 'react';
import { X, Users, CreditCard } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';
const PRICE_PER_READER = 100;

interface PurchaseMAUModalProps {
  institutionId: string;
  adminUserId: string;
  adminName: string;
  currentCapacity: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseMAUModal({
  institutionId,
  adminUserId,
  adminName,
  currentCapacity,
  onClose,
  onSuccess
}: PurchaseMAUModalProps) {
  const [additionalUsers, setAdditionalUsers] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalAmount = additionalUsers * PRICE_PER_READER;

  const handlePurchase = async () => {
    setLoading(true);
    
    try {
      // Create order
      const orderRes = await fetch(`${API_BASE_URL}/api/institution/mau/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          additional_users: additionalUsers,
          admin_user_id: adminUserId,
          admin_name: adminName
        })
      });

      if (!orderRes.ok) throw new Error('Failed to create order');

      const orderData = await orderRes.json();

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: orderData.razorpay_key,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'Firstchapter.ai',
          description: `Purchase ${additionalUsers} Additional Readers`,
          order_id: orderData.order.id,
          handler: async function (response: any) {
            // Verify payment
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/api/institution/mau/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  institution_id: institutionId,
                  order_id: orderData.order.id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  additional_users: additionalUsers,
                  admin_user_id: adminUserId,
                  admin_name: adminName
                })
              });

              if (!verifyRes.ok) throw new Error('Payment verification failed');

              const result = await verifyRes.json();
              alert(`✅ Successfully purchased ${additionalUsers} additional readers!\n\nNew capacity: ${result.new_capacity} students`);
              onSuccess();
              onClose();
            } catch (err) {
              console.error('Verification error:', err);
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: adminName,
          },
          theme: {
            color: '#1D9E75'
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        
        rzp.on('payment.failed', function (response: any) {
          alert('Payment failed: ' + response.error.description);
          setLoading(false);
        });
      };

    } catch (err) {
      console.error('Purchase error:', err);
      alert('Failed to initiate purchase. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Purchase Additional Readers</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={24} style={{ color: '#888780' }} />
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            background: '#E6F1FB',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users size={18} style={{ color: '#378ADD' }} />
              <span style={{ fontSize: '14px', color: '#666' }}>Current Capacity</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#378ADD' }}>
              {currentCapacity} students
            </div>
          </div>

          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            Number of Additional Readers
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={additionalUsers}
            onChange={(e) => setAdditionalUsers(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '6px' }}>
            ₹{PRICE_PER_READER} per reader
          </p>
        </div>

        <div style={{
          background: '#f9f9f7',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Additional Readers</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{additionalUsers}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Price per Reader</span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>₹{PRICE_PER_READER}</span>
          </div>
          <div style={{ height: '1px', background: '#e5e4dc', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>Total Amount</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#1D9E75' }}>₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <div style={{
          background: '#FFF4E5',
          border: '1px solid #FFE0B2',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
        }}>
          <p style={{ fontSize: '13px', color: '#8B5A00', margin: 0 }}>
            💡 New capacity: <strong>{currentCapacity + additionalUsers} students</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              background: 'white',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              background: '#1D9E75',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard size={18} />
                Pay ₹{totalAmount.toLocaleString()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
