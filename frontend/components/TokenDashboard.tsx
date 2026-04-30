/**
 * Token Usage Dashboard with Fair Usage Warnings
 * 
 * Shows user's token consumption with visual indicators
 * Includes Fair Usage Policy warnings and throttling information
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Zap, ArrowUpRight, Info, Clock } from 'lucide-react';

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

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toString();
  };

  const getUsagePercentage = (used: number | undefined, allocated: number | undefined) => {
    if (!allocated || allocated === 0 || !used) return 0;
    return Math.min(100, (used / allocated) * 100);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 95) return { color: 'red', label: 'Critical', icon: AlertTriangle };
    if (percentage >= 80) return { color: 'yellow', label: 'Warning', icon: AlertTriangle };
    if (percentage >= 60) return { color: 'blue', label: 'Good', icon: TrendingUp };
    return { color: 'green', label: 'Healthy', icon: Zap };
  };

  const getFairUsageMessage = (percentage: number) => {
    if (percentage >= 100) {
      return {
        level: 'critical',
        title: '🛑 Monthly Limit Reached',
        message: 'Your token allocation for this month has been exhausted. Your usage will reset on your renewal date.',
        action: 'Upgrade your plan to continue using the platform at full speed.',
        throttle: 'Service paused until reset',
      };
    }
    if (percentage >= 95) {
      return {
        level: 'critical',
        title: '🚨 Critical: Only 5% Remaining',
        message: 'You have very few tokens left. Queries are being throttled with a 5-second cooldown to prevent overuse.',
        action: 'Upgrade now to continue without interruption.',
        throttle: '5 second delay per query',
      };
    }
    if (percentage >= 90) {
      return {
        level: 'warning',
        title: '⚠️ Warning: 90% Used',
        message: 'You\'re approaching your monthly limit. A slight 2-second delay is applied to manage usage.',
        action: 'Consider upgrading to avoid service interruption.',
        throttle: '2 second delay per query',
      };
    }
    if (percentage >= 80) {
      return {
        level: 'notice',
        title: '💡 Notice: 80% Used',
        message: 'You\'ve used 80% of your monthly tokens. No restrictions yet, but you may want to plan ahead.',
        action: 'Monitor your usage or upgrade for more capacity.',
        throttle: 'No throttling (full speed)',
      };
    }
    return null;
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
  const fairUsageWarning = getFairUsageMessage(outputPercentage);
  const StatusIcon = outputStatus.icon;

  // Safe defaults for display
  const safeUsage = {
    query_count: usage.query_count || 0,
    total_tokens: usage.total_tokens || 0,
    total_input_tokens: usage.total_input_tokens || 0,
    total_output_tokens: usage.total_output_tokens || 0,
    input_tokens_used: usage.input_tokens_used || 0,
    output_tokens_used: usage.output_tokens_used || 0,
    tokens_used: usage.tokens_used || 0,
    input_tokens_allocated: usage.input_tokens_allocated || 0,
    output_tokens_allocated: usage.output_tokens_allocated || 0,
    tokens_allocated: usage.tokens_allocated || 0,
    tokens_remaining: usage.tokens_remaining || 0,
    openai_cost_usd: usage.openai_cost_usd || 0,
    openai_cost_inr: usage.openai_cost_inr || 0,
    days: usage.days || days,
  };

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
          <div className="text-3xl font-bold text-gray-900">{safeUsage.query_count}</div>
          <p className="text-xs text-gray-500 mt-1">Last {safeUsage.days} days</p>
        </div>

        {/* Total Tokens */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tokens Used</span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(safeUsage.total_tokens)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(safeUsage.total_input_tokens)} in + {formatNumber(safeUsage.total_output_tokens)} out
          </p>
        </div>

        {/* OpenAI Cost */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Platform Cost</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${safeUsage.openai_cost_usd.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ₹{safeUsage.openai_cost_inr.toFixed(2)} INR
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

      {/* Fair Usage Warning */}
      {fairUsageWarning && (
        <div className={`rounded-lg border p-5 ${
          fairUsageWarning.level === 'critical' ? 'bg-red-50 border-red-200' :
          fairUsageWarning.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
              fairUsageWarning.level === 'critical' ? 'text-red-600' :
              fairUsageWarning.level === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`} />
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                fairUsageWarning.level === 'critical' ? 'text-red-900' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-900' :
                'text-blue-900'
              }`}>
                {fairUsageWarning.title}
              </h3>
              <p className={`text-sm mb-2 ${
                fairUsageWarning.level === 'critical' ? 'text-red-800' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {fairUsageWarning.message}
              </p>
              
              {/* Throttle Status */}
              <div className={`flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded ${
                fairUsageWarning.level === 'critical' ? 'bg-red-100 text-red-800' :
                fairUsageWarning.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-medium">Current Throttle: {fairUsageWarning.throttle}</span>
              </div>

              <p className={`text-sm font-medium mb-3 ${
                fairUsageWarning.level === 'critical' ? 'text-red-900' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-900' :
                'text-blue-900'
              }`}>
                {fairUsageWarning.action}
              </p>
              
              {outputPercentage >= 80 && (
                <button 
                  onClick={() => window.location.href = '/pricing'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    fairUsageWarning.level === 'critical' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : fairUsageWarning.level === 'warning'
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {outputPercentage >= 95 ? 'Upgrade Now' : 'View Plans'}
                </button>
              )}
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
              {formatNumber(safeUsage.input_tokens_used)} / {formatNumber(safeUsage.input_tokens_allocated)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${inputPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {inputPercentage.toFixed(1)}% used • {formatNumber(safeUsage.input_tokens_allocated - safeUsage.input_tokens_used)} remaining
          </p>
        </div>

        {/* Output Tokens */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Output Tokens</span>
            <span className="text-sm text-gray-600">
              {formatNumber(safeUsage.output_tokens_used)} / {formatNumber(safeUsage.output_tokens_allocated)}
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
            {outputPercentage.toFixed(1)}% used • {formatNumber(safeUsage.output_tokens_allocated - safeUsage.output_tokens_used)} remaining
          </p>
        </div>

        {/* Total */}
        {safeUsage.tokens_allocated > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Allocation</span>
              <span className="text-sm text-gray-600">
                {formatNumber(safeUsage.tokens_used)} / {formatNumber(safeUsage.tokens_allocated)}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${totalPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalPercentage.toFixed(1)}% used • {formatNumber(safeUsage.tokens_remaining)} remaining
            </p>
          </div>
        )}
      </div>

      {/* Fair Usage Policy Info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-3">📘 Fair Usage Policy</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>You have <strong>unlimited queries</strong> within your token allocation. Our fair usage system ensures great experience for everyone:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-green-900">0-79%</span>
                  </div>
                  <p className="text-xs text-gray-700">Full speed, no restrictions ✅</p>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium text-blue-900">80-89%</span>
                  </div>
                  <p className="text-xs text-gray-700">Gentle warning, still full speed ⚠️</p>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="font-medium text-yellow-900">90-94%</span>
                  </div>
                  <p className="text-xs text-gray-700">2-second delay per query ⏸️</p>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="font-medium text-orange-900">95-99%</span>
                  </div>
                  <p className="text-xs text-gray-700">5-second throttling 🐌</p>
                </div>
              </div>
              
              <p className="mt-3 text-xs">
                <strong>Tokens reset monthly</strong> on your renewal date. Upgrade anytime for more capacity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">💡 Tips to Optimize Token Usage</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Ask focused questions to reduce output tokens</li>
          <li>• Use specific book selections instead of searching all books</li>
          <li>• Output tokens count more toward your limit (67% of budget)</li>
          <li>• Simple queries use fewer tokens than complex ones</li>
        </ul>
      </div>
    </div>
  );
}
