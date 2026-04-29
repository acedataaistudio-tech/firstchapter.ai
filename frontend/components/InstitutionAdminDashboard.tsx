/**
 * Institution Admin Dashboard
 * 
 * Complete dashboard for institution administrators
 * Includes MAU tracking, user purchase, and token monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, ShoppingCart, AlertCircle, Check, Loader2 } from 'lucide-react';

interface MAUStats {
  institution_id: string;
  current_month: string;
  active_users: number;
  free_users_limit: number;
  additional_users_purchased: number;
  total_capacity: number;
  available_slots: number;
  usage_percentage: number;
  status: 'healthy' | 'notice' | 'warning' | 'critical';
  recent_active_users: Array<{
    user_id: string;
    last_active_at: string;
    query_count: number;
  }>;
}

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (count: number) => Promise<void>;
  currentCapacity: number;
  activeUsers: number;
}

function PurchaseUsersModal({
  isOpen,
  onClose,
  onPurchase,
  currentCapacity,
  activeUsers,
}: PurchaseModalProps) {
  const [userCount, setUserCount] = useState(100);
  const [loading, setLoading] = useState(false);

  const pricePerUser = 100; // ₹100 per user
  const totalCost = userCount * pricePerUser;
  const newCapacity = currentCapacity + userCount;

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await onPurchase(userCount);
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Purchase Additional Users</h2>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Current Capacity</span>
            <span className="font-semibold">{currentCapacity} users</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active Users</span>
            <span className="font-semibold">{activeUsers} users</span>
          </div>
        </div>

        {/* User Count Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Additional Users
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            step="10"
            value={userCount}
            onChange={(e) => setUserCount(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-2 mt-2">
            {[50, 100, 250, 500].map((count) => (
              <button
                key={count}
                onClick={() => setUserCount(count)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Price per user</span>
            <span className="font-semibold">₹{pricePerUser}/year</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Users to add</span>
            <span className="font-semibold">{userCount} users</span>
          </div>
          <div className="border-t border-blue-300 my-2"></div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Total Cost</span>
            <span className="font-bold text-xl text-blue-600">₹{totalCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* New Capacity Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 text-green-800 text-sm">
            <Check className="w-4 h-4" />
            <span>New capacity will be: <strong>{newCapacity} users</strong></span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading || userCount < 1}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Purchase ₹{totalCost.toLocaleString('en-IN')}
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Payment will be processed via Razorpay. Capacity increases immediately after payment.
        </p>
      </div>
    </div>
  );
}

export function InstitutionAdminDashboard({ institutionId }: { institutionId: string }) {
  const [mauStats, setMAUStats] = useState<MAUStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    fetchMAUStats();
    // Refresh every minute
    const interval = setInterval(fetchMAUStats, 60000);
    return () => clearInterval(interval);
  }, [institutionId]);

  const fetchMAUStats = async () => {
    try {
      const response = await fetch(`/api/institution/${institutionId}/mau`);
      const data = await response.json();
      setMAUStats(data);
    } catch (error) {
      console.error('Failed to fetch MAU stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseUsers = async (userCount: number) => {
    try {
      const response = await fetch(`/api/institution/${institutionId}/buy-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users_count: userCount }),
      });

      const data = await response.json();

      // Open Razorpay checkout
      const options = {
        key: data.razorpay_key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'Firstchapter.ai',
        description: `${data.users_count} Additional Users`,
        handler: function (response: any) {
          alert('Payment successful! Capacity updated.');
          fetchMAUStats(); // Refresh stats
        },
        prefill: {
          name: 'Institution Admin',
          email: 'admin@institution.edu',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      alert('Failed to process purchase. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!mauStats) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'notice': return 'blue';
      default: return 'green';
    }
  };

  const statusColor = getStatusColor(mauStats.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Institution Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monthly Active Users for {new Date(mauStats.current_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShoppingCart className="w-4 h-4" />
          Buy More Users
        </button>
      </div>

      {/* Alert Banner */}
      {mauStats.usage_percentage >= 80 && (
        <div className={`border rounded-lg p-4 ${
          statusColor === 'red' ? 'bg-red-50 border-red-200' :
          statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              statusColor === 'red' ? 'text-red-600' :
              statusColor === 'yellow' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
            <div>
              <h3 className={`font-semibold ${
                statusColor === 'red' ? 'text-red-900' :
                statusColor === 'yellow' ? 'text-yellow-900' :
                'text-blue-900'
              }`}>
                {mauStats.usage_percentage >= 95
                  ? 'Critical: User Capacity Almost Reached'
                  : mauStats.usage_percentage >= 90
                  ? 'Warning: Approaching User Limit'
                  : 'Notice: User Capacity Above 80%'}
              </h3>
              <p className={`text-sm mt-1 ${
                statusColor === 'red' ? 'text-red-700' :
                statusColor === 'yellow' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                You're using {mauStats.usage_percentage.toFixed(1)}% of your capacity. 
                Consider purchasing additional users to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Users</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{mauStats.active_users}</div>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Capacity</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{mauStats.total_capacity}</div>
          <p className="text-xs text-gray-500 mt-1">
            {mauStats.free_users_limit} included + {mauStats.additional_users_purchased} purchased
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Available Slots</span>
            <Check className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{mauStats.available_slots}</div>
          <p className="text-xs text-gray-500 mt-1">Users can still join</p>
        </div>

        <div className={`rounded-lg border p-6 ${
          statusColor === 'red' ? 'bg-red-50 border-red-200' :
          statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
          statusColor === 'blue' ? 'bg-blue-50 border-blue-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Usage</span>
            <AlertCircle className={`w-5 h-5 ${
              statusColor === 'red' ? 'text-red-600' :
              statusColor === 'yellow' ? 'text-yellow-600' :
              statusColor === 'blue' ? 'text-blue-600' :
              'text-green-600'
            }`} />
          </div>
          <div className={`text-3xl font-bold ${
            statusColor === 'red' ? 'text-red-900' :
            statusColor === 'yellow' ? 'text-yellow-900' :
            statusColor === 'blue' ? 'text-blue-900' :
            'text-green-900'
          }`}>
            {mauStats.usage_percentage.toFixed(0)}%
          </div>
          <p className={`text-xs mt-1 ${
            statusColor === 'red' ? 'text-red-700' :
            statusColor === 'yellow' ? 'text-yellow-700' :
            statusColor === 'blue' ? 'text-blue-700' :
            'text-green-700'
          }`}>
            {mauStats.status.charAt(0).toUpperCase() + mauStats.status.slice(1)}
          </p>
        </div>
      </div>

      {/* Usage Bar */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity Usage</h3>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              statusColor === 'red' ? 'bg-red-500' :
              statusColor === 'yellow' ? 'bg-yellow-500' :
              statusColor === 'blue' ? 'bg-blue-500' :
              'bg-green-500'
            }`}
            style={{ width: `${mauStats.usage_percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{mauStats.active_users} active users</span>
          <span>{mauStats.total_capacity} total capacity</span>
        </div>
      </div>

      {/* Recent Activity */}
      {mauStats.recent_active_users && mauStats.recent_active_users.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Active Users</h3>
          <div className="space-y-2">
            {mauStats.recent_active_users.slice(0, 5).map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.user_id}</div>
                    <div className="text-sm text-gray-500">
                      {user.query_count} queries
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(user.last_active_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      <PurchaseUsersModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchase={handlePurchaseUsers}
        currentCapacity={mauStats.total_capacity}
        activeUsers={mauStats.active_users}
      />
    </div>
  );
}

// Usage Example:
//
// import { InstitutionAdminDashboard } from '@/components/InstitutionAdminDashboard';
//
// function AdminPage() {
//   const { institution } = useAuth();
//
//   return (
//     <div className="container mx-auto p-6">
//       <InstitutionAdminDashboard institutionId={institution.id} />
//     </div>
//   );
// }
