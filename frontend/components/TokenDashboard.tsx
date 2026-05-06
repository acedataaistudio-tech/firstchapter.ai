/**
 * Token Usage Dashboard with Fair Usage Warnings
 *
 * For institution users: shows per-student monthly cap as primary view,
 * with institution pool as secondary context.
 * For non-institution users: shows subscription allocation as before.
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Zap, Info, Building2 } from 'lucide-react';

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
  tokens_remaining: number | null;
  query_count: number;
  days: number;
  // 🆕 Institution-specific fields
  is_institution_user: boolean;
  institution_id: string | null;
  institution_name: string | null;
  student_tokens_allocated: number;
  student_tokens_used: number;
  student_usage_percent: number;
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

  const pct = (used: number, allocated: number) => {
    if (!allocated || allocated === 0) return 0;
    return Math.min(100, (used / allocated) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return 'red';
    if (percentage >= 80) return 'yellow';
    if (percentage >= 60) return 'blue';
    return 'green';
  };

  const getFairUsageMessage = (percentage: number, isInstitution: boolean) => {
    if (percentage >= 100) {
      return {
        level: 'critical',
        title: '🛑 Monthly Limit Reached',
        message: isInstitution
          ? "You've reached your monthly token cap. Resets on the 1st of next month, or contact your institution admin for a top-up."
          : 'Your token allocation for this month has been exhausted. Your usage will reset on your renewal date.',
        action: isInstitution ? 'Contact your institution admin to release additional tokens.' : 'Upgrade your plan to continue.',
      };
    }
    if (percentage >= 95) {
      return {
        level: 'critical',
        title: '🚨 Critical: Only 5% Remaining',
        message: "You have very few tokens left. Queries are throttled to manage usage.",
        action: isInstitution ? 'Contact your institution admin if more tokens are needed.' : 'Upgrade now to continue without interruption.',
      };
    }
    if (percentage >= 90) {
      return {
        level: 'warning',
        title: '⚠️ Warning: 90% Used',
        message: "You're approaching your monthly limit. Per-query token caps are being reduced.",
        action: isInstitution ? 'Plan ahead — your cap resets at the start of next month.' : 'Consider upgrading to avoid service interruption.',
      };
    }
    if (percentage >= 80) {
      return {
        level: 'notice',
        title: '💡 Notice: 80% Used',
        message: "You've used 80% of your monthly tokens.",
        action: 'Monitor your usage as you approach the cap.',
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

  const isInstitution = usage.is_institution_user;

  // Primary metric: for institution users it's the personal cap;
  // for everyone else it's their subscription's combined token allocation.
  const primaryUsed = isInstitution ? usage.student_tokens_used : usage.tokens_used;
  const primaryAllocated = isInstitution ? usage.student_tokens_allocated : usage.tokens_allocated;
  const primaryPct = pct(primaryUsed, primaryAllocated);
  const primaryColor = getUsageColor(primaryPct);
  const fairUsageWarning = getFairUsageMessage(primaryPct, isInstitution);

  // Institution pool (only relevant for institution users)
  const poolInputPct = pct(usage.input_tokens_used, usage.input_tokens_allocated);
  const poolOutputPct = pct(usage.output_tokens_used, usage.output_tokens_allocated);

  const safeUsage = {
    query_count: usage.query_count || 0,
    total_tokens: usage.total_tokens || 0,
    total_input_tokens: usage.total_input_tokens || 0,
    total_output_tokens: usage.total_output_tokens || 0,
    days: usage.days || days,
  };

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Queries */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Queries</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{safeUsage.query_count}</div>
          <p className="text-xs text-gray-500 mt-1">Last {safeUsage.days} days</p>
        </div>

        {/* Tokens Used (this user's actual usage from token_usage) */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Tokens Used</span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatNumber(safeUsage.total_tokens)}</div>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(safeUsage.total_input_tokens)} in + {formatNumber(safeUsage.total_output_tokens)} out
          </p>
        </div>

        {/* Status — driven by primary percentage */}
        <div className={`bg-white rounded-lg border p-6 ${
          primaryColor === 'red' ? 'border-red-200 bg-red-50' :
          primaryColor === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
          primaryColor === 'blue' ? 'border-blue-200 bg-blue-50' :
          'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Usage Status</span>
            <AlertTriangle className={`w-4 h-4 ${
              primaryColor === 'red' ? 'text-red-500' :
              primaryColor === 'yellow' ? 'text-yellow-500' :
              primaryColor === 'blue' ? 'text-blue-500' :
              'text-green-500'
            }`} />
          </div>
          <div className="text-3xl font-bold text-gray-900">{primaryPct.toFixed(0)}%</div>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {primaryColor === 'red' ? 'Critical' : primaryColor === 'yellow' ? 'Warning' : primaryColor === 'blue' ? 'Active' : 'Healthy'}
          </p>
        </div>
      </div>

      {/* Fair Usage Warning Banner */}
      {fairUsageWarning && (
        <div className={`rounded-lg border-2 p-5 ${
          fairUsageWarning.level === 'critical' ? 'bg-red-50 border-red-300' :
          fairUsageWarning.level === 'warning' ? 'bg-yellow-50 border-yellow-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              fairUsageWarning.level === 'critical' ? 'text-red-600' :
              fairUsageWarning.level === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <h3 className={`font-semibold mb-1 ${
                fairUsageWarning.level === 'critical' ? 'text-red-900' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-900' : 'text-blue-900'
              }`}>
                {fairUsageWarning.title}
              </h3>
              <p className={`text-sm mb-2 ${
                fairUsageWarning.level === 'critical' ? 'text-red-800' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-800' : 'text-blue-800'
              }`}>
                {fairUsageWarning.message}
              </p>
              <p className={`text-sm font-medium ${
                fairUsageWarning.level === 'critical' ? 'text-red-900' :
                fairUsageWarning.level === 'warning' ? 'text-yellow-900' : 'text-blue-900'
              }`}>
                {fairUsageWarning.action}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary breakdown — institution student view */}
      {isInstitution && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-900">Your Monthly Allocation</h3>
            {usage.institution_name && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 size={12} /> {usage.institution_name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Resets on the 1st of each month. Contact your institution admin if you need additional tokens.
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Tokens This Month</span>
            <span className="text-sm text-gray-600">
              {formatNumber(usage.student_tokens_used)} / {formatNumber(usage.student_tokens_allocated)}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                primaryPct >= 95 ? 'bg-red-500' : primaryPct >= 80 ? 'bg-yellow-500' : primaryPct >= 60 ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{ width: `${primaryPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {primaryPct.toFixed(1)}% used • {formatNumber(Math.max(0, usage.student_tokens_allocated - usage.student_tokens_used))} remaining
          </p>
        </div>
      )}

      {/* Institution pool (secondary context for institution users) */}
      {isInstitution && (usage.input_tokens_allocated > 0 || usage.output_tokens_allocated > 0) && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Institution Pool</h3>
          <p className="text-xs text-gray-500 mb-4">
            Shared across all members of your institution. Throttling kicks in at 80%+.
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Input Tokens</span>
              <span className="text-sm text-gray-600">
                {formatNumber(usage.input_tokens_used)} / {formatNumber(usage.input_tokens_allocated)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${poolInputPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{poolInputPct.toFixed(1)}% used institution-wide</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Output Tokens</span>
              <span className="text-sm text-gray-600">
                {formatNumber(usage.output_tokens_used)} / {formatNumber(usage.output_tokens_allocated)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                poolOutputPct >= 95 ? 'bg-red-500' : poolOutputPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`} style={{ width: `${poolOutputPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{poolOutputPct.toFixed(1)}% used institution-wide</p>
          </div>
        </div>
      )}

      {/* Non-institution view — original breakdown layout */}
      {!isInstitution && usage.tokens_allocated > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Token Usage Breakdown</h3>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Input Tokens</span>
              <span className="text-sm text-gray-600">
                {formatNumber(usage.input_tokens_used)} / {formatNumber(usage.input_tokens_allocated)}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${poolInputPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {poolInputPct.toFixed(1)}% used • {formatNumber(Math.max(0, usage.input_tokens_allocated - usage.input_tokens_used))} remaining
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Output Tokens</span>
              <span className="text-sm text-gray-600">
                {formatNumber(usage.output_tokens_used)} / {formatNumber(usage.output_tokens_allocated)}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                poolOutputPct >= 95 ? 'bg-red-500' : poolOutputPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`} style={{ width: `${poolOutputPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {poolOutputPct.toFixed(1)}% used • {formatNumber(Math.max(0, usage.output_tokens_allocated - usage.output_tokens_used))} remaining
            </p>
          </div>
        </div>
      )}

      {/* Fair Usage Policy info */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-3">📘 Fair Usage Policy</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p>You have <strong>unlimited queries</strong> within your token allocation. To keep things fair:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium text-green-900">0–79%</span>
                  </div>
                  <p className="text-xs text-gray-700">Full speed ✅</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-blue-900">80–89%</span>
                  </div>
                  <p className="text-xs text-gray-700">Notice shown, full speed ⚠️</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="font-medium text-yellow-900">90–94%</span>
                  </div>
                  <p className="text-xs text-gray-700">Per-query token cap reduced</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-medium text-orange-900">95–99%</span>
                  </div>
                  <p className="text-xs text-gray-700">Stricter token cap per query</p>
                </div>
              </div>
              <p className="mt-3 text-xs">
                <strong>Tokens reset monthly</strong> on the 1st. {isInstitution ? 'Contact your institution admin for a top-up.' : 'Upgrade anytime for more capacity.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
