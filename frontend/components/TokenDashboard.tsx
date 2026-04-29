/**
 * Token Usage Dashboard
 * 
 * Shows user's token consumption with visual indicators
 * Includes warnings when approaching limits
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Zap, ArrowUpRight } from 'lucide-react';

interface TokenUsage {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  input_tokens_allocated: number;
  output_tokens_allocated: number;
  tokens_allocated: number;
  input_tokens_used: number;
  output_tokens_used: number;
  tokens_used: number;
  tokens_remaining: number;
  query_count: number;
  openai_cost_usd: number;
  openai_cost_inr: number;
  days: number;
}

interface TokenDashboardProps {
  userId: string;
  days?: number;
}

export function TokenDashboard({ userId, days = 30 }: TokenDashboardProps) {
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [userId, days]);

  const fetchUsage = async () => {
    try {
      const response = await fetch(`/api/usage/tokens?user_id=${userId}&days=${days}`);
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
  };

  const getUsagePercentage = (used: number, allocated: number) => {
    if (!allocated) return 0;
    return Math.min(100, (used / allocated) * 100);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', label: 'Critical', icon: AlertTriangle };
    if (percentage >= 80) return { color: 'yellow', label: 'Warning', icon: AlertTriangle };
    if (percentage >= 60) return { color: 'blue', label: 'Good', icon: TrendingUp };
    return { color: 'green', label: 'Healthy', icon: Zap };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">Loading usage data...</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-600">No usage data available</p>
      </div>
    );
  }

  const inputPercentage = getUsagePercentage(usage.input_tokens_used, usage.input_tokens_allocated);
  const outputPercentage = getUsagePercentage(usage.output_tokens_used, usage.output_tokens_allocated);
  const totalPercentage = getUsagePercentage(usage.tokens_used, usage.tokens_allocated);

  const outputStatus = getUsageStatus(outputPercentage);
  const StatusIcon = outputStatus.icon;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Queries */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Queries</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{usage.query_count}</div>
          <p className="text-xs text-gray-500 mt-1">Last {days} days</p>
        </div>

        {/* Total Tokens */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tokens Used</span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(usage.total_tokens)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(usage.total_input_tokens)} in + {formatNumber(usage.total_output_tokens)} out
          </p>
        </div>

        {/* OpenAI Cost */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Platform Cost</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${usage.openai_cost_usd.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ₹{usage.openai_cost_inr} INR
          </p>
        </div>

        {/* Status */}
        <div className={`bg-white rounded-lg border p-6 ${
          outputStatus.color === 'red' ? 'border-red-200 bg-red-50' :
          outputStatus.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
          outputStatus.color === 'blue' ? 'border-blue-200 bg-blue-50' :
          'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Usage Status</span>
            <StatusIcon className={`w-5 h-5 ${
              outputStatus.color === 'red' ? 'text-red-600' :
              outputStatus.color === 'yellow' ? 'text-yellow-600' :
              outputStatus.color === 'blue' ? 'text-blue-600' :
              'text-green-600'
            }`} />
          </div>
          <div className={`text-3xl font-bold ${
            outputStatus.color === 'red' ? 'text-red-900' :
            outputStatus.color === 'yellow' ? 'text-yellow-900' :
            outputStatus.color === 'blue' ? 'text-blue-900' :
            'text-green-900'
          }`}>
            {outputPercentage.toFixed(0)}%
          </div>
          <p className={`text-xs mt-1 ${
            outputStatus.color === 'red' ? 'text-red-700' :
            outputStatus.color === 'yellow' ? 'text-yellow-700' :
            outputStatus.color === 'blue' ? 'text-blue-700' :
            'text-green-700'
          }`}>
            {outputStatus.label}
          </p>
        </div>
      </div>

      {/* Critical Warning */}
      {outputPercentage >= 90 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">
                {outputPercentage >= 95 ? 'Critical: Token Limit Almost Reached' : 'Warning: Approaching Token Limit'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                You've used {outputPercentage.toFixed(1)}% of your output tokens. 
                {outputPercentage >= 95 
                  ? ' Queries will be throttled. Consider upgrading your plan.'
                  : ' Consider upgrading to avoid service interruption.'}
              </p>
              <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Usage */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Token Usage Breakdown</h3>

        {/* Input Tokens */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Input Tokens</span>
            <span className="text-sm text-gray-600">
              {formatNumber(usage.input_tokens_used)} / {formatNumber(usage.input_tokens_allocated)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${inputPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {inputPercentage.toFixed(1)}% used • {formatNumber(usage.input_tokens_allocated - usage.input_tokens_used)} remaining
          </p>
        </div>

        {/* Output Tokens */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Output Tokens</span>
            <span className="text-sm text-gray-600">
              {formatNumber(usage.output_tokens_used)} / {formatNumber(usage.output_tokens_allocated)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                outputPercentage >= 95 ? 'bg-red-500' :
                outputPercentage >= 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${outputPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {outputPercentage.toFixed(1)}% used • {formatNumber(usage.output_tokens_allocated - usage.output_tokens_used)} remaining
          </p>
        </div>

        {/* Total */}
        {usage.tokens_allocated > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Allocation</span>
              <span className="text-sm text-gray-600">
                {formatNumber(usage.tokens_used)} / {formatNumber(usage.tokens_allocated)}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${totalPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalPercentage.toFixed(1)}% used • {formatNumber(usage.tokens_remaining || 0)} remaining
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Tips to Optimize Token Usage</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ask focused questions to reduce output tokens</li>
          <li>• Use specific book selections instead of searching all books</li>
          <li>• Output tokens count more toward your limit (67% of budget)</li>
        </ul>
      </div>
    </div>
  );
}

// Usage Example:
//
// import { TokenDashboard } from '@/components/TokenDashboard';
//
// function DashboardPage() {
//   const { user } = useAuth();
//
//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-3xl font-bold mb-6">Your Usage</h1>
//       <TokenDashboard userId={user.id} days={30} />
//     </div>
//   );
// }
