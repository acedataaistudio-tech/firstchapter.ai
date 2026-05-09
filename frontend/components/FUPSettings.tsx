import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AlertTriangle, Users, Zap, Clock, X } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

// ──────────────────────────────────────────────────────────────────
// Confirmation modal — shown when backend returns impact preview
// ──────────────────────────────────────────────────────────────────
interface ImpactPreview {
  per_student_allocation_before: number;
  per_student_allocation_after: number;
  delta_tokens_per_student: number;
  affected_active_students: number;
  max_tokens_per_request_before: number;
  max_tokens_per_request_after: number;
  rate_limit_per_minute_before: number;
  rate_limit_per_minute_after: number;
}

function formatTokens(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toString();
}

function ConfirmationModal({
  preview,
  warnings,
  quotaImpact,
  estimatedDays,
  onCancel,
  onConfirm,
  submitting,
}: {
  preview: ImpactPreview;
  warnings?: string[];
  quotaImpact?: string;
  estimatedDays?: number;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const capChanged = preview.per_student_allocation_before !== preview.per_student_allocation_after;
  const maxTokensChanged = preview.max_tokens_per_request_before !== preview.max_tokens_per_request_after;
  const rateLimitChanged = preview.rate_limit_per_minute_before !== preview.rate_limit_per_minute_after;

  const deltaSign = preview.delta_tokens_per_student >= 0 ? '+' : '';
  const deltaIsPositive = preview.delta_tokens_per_student >= 0;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '560px',
          width: '100%',
          border: '1px solid #e5e4dc',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, marginBottom: '6px' }}>
              Confirm Settings Change
            </h2>
            <p style={{ fontSize: '13px', color: '#888780', margin: 0 }}>
              Review the impact before applying.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#888780',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Optional warnings from validation */}
        {warnings && warnings.length > 0 && (
          <div style={{
            background: '#FFF8E7',
            border: '1px solid #FFE4A3',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}>
            <AlertTriangle size={18} style={{ color: '#B8860B', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B5A00', marginBottom: '4px' }}>
                Validation warnings
              </div>
              <ul style={{ fontSize: '13px', color: '#8B5A00', margin: 0, paddingLeft: '18px' }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Affected students */}
        <div style={{
          background: '#f9f9f7',
          border: '1px solid #e5e4dc',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <Users size={18} style={{ color: '#378ADD' }} />
          <div style={{ fontSize: '14px' }}>
            This will affect{' '}
            <strong>{preview.affected_active_students} active student{preview.affected_active_students !== 1 ? 's' : ''}</strong>
            {' '}at your institution.
          </div>
        </div>

        {/* Per-student allocation change */}
        {capChanged && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Zap size={14} style={{ color: '#1D9E75' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>
                Per-Student Token Allocation
              </span>
            </div>
            <div style={{ fontSize: '14px', paddingLeft: '22px' }}>
              <span style={{ color: '#888780' }}>{formatTokens(preview.per_student_allocation_before)}</span>
              <span style={{ margin: '0 8px', color: '#888780' }}>→</span>
              <span style={{ fontWeight: '600' }}>{formatTokens(preview.per_student_allocation_after)}</span>
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                background: deltaIsPositive ? '#E1F5EE' : '#FDEDEC',
                color: deltaIsPositive ? '#1D9E75' : '#C0392B',
              }}>
                {deltaSign}{formatTokens(Math.abs(preview.delta_tokens_per_student))} per student
              </span>
            </div>
          </div>
        )}

        {/* Max tokens per query change */}
        {maxTokensChanged && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Zap size={14} style={{ color: '#378ADD' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>
                Max Tokens Per Query
              </span>
            </div>
            <div style={{ fontSize: '14px', paddingLeft: '22px' }}>
              <span style={{ color: '#888780' }}>{preview.max_tokens_per_request_before.toLocaleString()}</span>
              <span style={{ margin: '0 8px', color: '#888780' }}>→</span>
              <span style={{ fontWeight: '600' }}>{preview.max_tokens_per_request_after.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Rate limit change */}
        {rateLimitChanged && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Clock size={14} style={{ color: '#9B59B6' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>
                Rate Limit (Requests per Minute)
              </span>
            </div>
            <div style={{ fontSize: '14px', paddingLeft: '22px' }}>
              <span style={{ color: '#888780' }}>{preview.rate_limit_per_minute_before}/min</span>
              <span style={{ margin: '0 8px', color: '#888780' }}>→</span>
              <span style={{ fontWeight: '600' }}>{preview.rate_limit_per_minute_after}/min</span>
            </div>
          </div>
        )}

        {/* Quota impact / forecast (if backend provided) */}
        {(quotaImpact || estimatedDays !== undefined) && (
          <div style={{
            background: '#FFF8E7',
            border: '1px solid #FFE4A3',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '12px',
            marginBottom: '4px',
          }}>
            {quotaImpact && (
              <div style={{ fontSize: '13px', color: '#8B5A00', marginBottom: estimatedDays ? '6px' : 0 }}>
                {quotaImpact}
              </div>
            )}
            {estimatedDays !== undefined && (
              <div style={{ fontSize: '13px', color: '#8B5A00' }}>
                <strong>Estimated days until quota exhaustion:</strong> ~{estimatedDays} days
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              background: 'white',
              color: '#888780',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              background: '#1D9E75',
              color: 'white',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Applying...' : 'Confirm and Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Toast notification
// ──────────────────────────────────────────────────────────────────
function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        background: type === 'success' ? '#E1F5EE' : '#FDEDEC',
        border: `1px solid ${type === 'success' ? '#1D9E75' : '#E74C3C'}`,
        color: type === 'success' ? '#1D9E75' : '#C0392B',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1200,
        maxWidth: '440px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────
export function FUPSettings({ institutionId, currentSettings, onUpdate }: any) {
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const [settings, setSettings] = useState({
    student_cap_percentage: currentSettings?.student_cap_percentage || 0.5,
    max_tokens_per_request: currentSettings?.max_tokens_per_request || 4000,
    rate_limit_per_minute: currentSettings?.rate_limit_per_minute || 15,
    change_reason: '',
  });

  // Confirmation modal state
  const [pendingPreview, setPendingPreview] = useState<ImpactPreview | null>(null);
  const [pendingWarnings, setPendingWarnings] = useState<string[] | undefined>(undefined);
  const [pendingQuotaImpact, setPendingQuotaImpact] = useState<string | undefined>(undefined);
  const [pendingEstimatedDays, setPendingEstimatedDays] = useState<number | undefined>(undefined);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const submitRequest = async (confirmed: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
          ...settings,
          confirmed,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail || `Update failed (${res.status})`;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }

      // Validation errors (out-of-bounds values, etc.)
      if (data.errors && data.errors.length > 0) {
        setToast({ type: 'error', message: data.errors.join(' • ') });
        setPendingPreview(null);
        return;
      }

      // First-call gate — backend wants confirmation; show modal
      if (data.requires_confirmation && data.impact_preview) {
        setPendingPreview(data.impact_preview);
        setPendingWarnings(data.warnings);
        setPendingQuotaImpact(data.quota_impact);
        setPendingEstimatedDays(data.estimated_days);
        return;
      }

      // Save succeeded
      if (data.success) {
        const studentsUpdated = data.propagation?.updated_students || 0;
        const propagationError = data.propagation?.error;

        let msg = 'Settings updated successfully';
        if (studentsUpdated > 0) {
          msg += ` — ${studentsUpdated} student${studentsUpdated !== 1 ? 's' : ''} updated`;
        }
        if (propagationError) {
          msg += ` (warning: per-student propagation reported issue: ${propagationError})`;
        }

        setToast({ type: 'success', message: msg });
        setPendingPreview(null);
        setSettings({ ...settings, change_reason: '' });
        onUpdate();
        return;
      }

      // Unknown shape
      setToast({ type: 'error', message: data.message || 'Settings save failed' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to update settings' });
      setPendingPreview(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = () => {
    if (!settings.change_reason.trim()) {
      setToast({ type: 'error', message: 'Please provide a reason for this change.' });
      return;
    }
    // First call — confirmed=false; backend may return preview
    submitRequest(false);
  };

  const handleConfirm = () => {
    submitRequest(true);
  };

  const handleCancelConfirm = () => {
    if (!submitting) {
      setPendingPreview(null);
      setPendingWarnings(undefined);
      setPendingQuotaImpact(undefined);
      setPendingEstimatedDays(undefined);
    }
  };

  return (
    <div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Fair Usage Policy Controls
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            Per-Student Cap (% of total quota)
          </label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={settings.student_cap_percentage}
            onChange={(e) => setSettings({ ...settings, student_cap_percentage: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75' }}>
            {settings.student_cap_percentage}%
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            Max Tokens Per Request
          </label>
          <input
            type="range"
            min="500"
            max="8000"
            step="100"
            value={settings.max_tokens_per_request}
            onChange={(e) => setSettings({ ...settings, max_tokens_per_request: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#378ADD' }}>
            {settings.max_tokens_per_request.toLocaleString()}
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            Rate Limit (Requests per Minute)
          </label>
          <select
            value={settings.rate_limit_per_minute}
            onChange={(e) => setSettings({ ...settings, rate_limit_per_minute: parseInt(e.target.value) })}
            style={{ width: '100%', padding: '10px', border: '1px solid #e5e4dc', borderRadius: '8px' }}
          >
            {[5, 10, 15, 20, 25, 30].map(val => (
              <option key={val} value={val}>{val} requests/min</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
            Reason for Change *
          </label>
          <textarea
            value={settings.change_reason}
            onChange={(e) => setSettings({ ...settings, change_reason: e.target.value })}
            placeholder="Explain why you're changing these settings..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              minHeight: '80px',
              fontFamily: 'inherit',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={submitting}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: '8px',
            background: '#1D9E75',
            color: 'white',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            alignSelf: 'flex-start',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {submitting ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Confirmation modal */}
      {pendingPreview && (
        <ConfirmationModal
          preview={pendingPreview}
          warnings={pendingWarnings}
          quotaImpact={pendingQuotaImpact}
          estimatedDays={pendingEstimatedDays}
          onCancel={handleCancelConfirm}
          onConfirm={handleConfirm}
          submitting={submitting}
        />
      )}
    </div>
  );
}
