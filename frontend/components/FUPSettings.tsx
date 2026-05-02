import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Settings, AlertTriangle, Info } from 'lucide-react';

interface FUPSettingsProps {
  institutionId: string;
  currentSettings: any;
  onUpdate: () => void;
}

export function FUPSettings({ institutionId, currentSettings, onUpdate }: FUPSettingsProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const [settings, setSettings] = useState({
    student_cap_percentage: currentSettings?.student_cap_percentage || 0.5,
    max_tokens_per_request: currentSettings?.max_tokens_per_request || 4000,
    rate_limit_per_minute: currentSettings?.rate_limit_per_minute || 15,
    change_reason: '',
  });

  const handleSave = async () => {
    if (!settings.change_reason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    setLoading(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/institution/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
          ...settings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Update failed');
      }

      // Check validation result
      if (!data.success) {
        setValidationResult(data);
        
        if (data.requires_confirmation) {
          setShowConfirmation(true);
        } else if (data.errors && data.errors.length > 0) {
          alert('Settings validation failed:\n\n' + data.errors.join('\n'));
        }
        return;
      }

      // Success
      alert('Settings updated successfully!');
      onUpdate(); // Reload dashboard
      setSettings({ ...settings, change_reason: '' });
    } catch (err: any) {
      console.error('Settings update failed:', err);
      alert('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmedSave = async () => {
    // User confirmed risky change - proceed anyway
    // You would implement force-save logic here
    alert('Force save not yet implemented. Please adjust settings to safe values.');
    setShowConfirmation(false);
  };

  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
        Fair Usage Policy Controls
      </h3>
      <p style={{ fontSize: '14px', color: '#888780', marginBottom: '24px' }}>
        Configure token limits and rate limiting for your institution. Changes are audited.
      </p>

      {/* Current Source */}
      {currentSettings?.source && (
        <div style={{
          background: currentSettings.source === 'platform_override' ? '#FFF4E5' : 
                     currentSettings.source === 'trial_default' ? '#E6F4FF' : '#f5f5f3',
          border: '1px solid ' + (currentSettings.source === 'platform_override' ? '#FFE0B2' :
                                 currentSettings.source === 'trial_default' ? '#B3D9FF' : '#e5e4dc'),
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#2C2C2A',
        }}>
          <strong>Current Settings Source:</strong>{' '}
          {currentSettings.source === 'platform_override' && '🔒 Platform Admin Override (Contact support to change)'}
          {currentSettings.source === 'trial_default' && '🆓 Trial Mode (Settings locked until trial ends)'}
          {currentSettings.source === 'institution' && '✅ Institution Settings (You can modify)'}
        </div>
      )}

      {/* Settings Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Student Cap Percentage */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2C2C2A',
          }}>
            Per-Student Cap (% of total quota)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={settings.student_cap_percentage}
              onChange={(e) => setSettings({ ...settings, student_cap_percentage: parseFloat(e.target.value) })}
              disabled={currentSettings?.source !== 'institution'}
              style={{ flex: 1 }}
            />
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1D9E75',
              minWidth: '60px',
            }}>
              {settings.student_cap_percentage}%
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            Range: 0.1% - 2.0%. Each student gets this percentage of total monthly quota.
          </p>
        </div>

        {/* Max Tokens Per Request */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2C2C2A',
          }}>
            Max Tokens Per Request
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="500"
              max="8000"
              step="100"
              value={settings.max_tokens_per_request}
              onChange={(e) => setSettings({ ...settings, max_tokens_per_request: parseInt(e.target.value) })}
              disabled={currentSettings?.source !== 'institution'}
              style={{ flex: 1 }}
            />
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#378ADD',
              minWidth: '80px',
            }}>
              {settings.max_tokens_per_request.toLocaleString()}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            Range: 500 - 8,000. Maximum tokens allowed per single query.
          </p>
        </div>

        {/* Rate Limit */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2C2C2A',
          }}>
            Rate Limit (Requests per Minute)
          </label>
          <select
            value={settings.rate_limit_per_minute}
            onChange={(e) => setSettings({ ...settings, rate_limit_per_minute: parseInt(e.target.value) })}
            disabled={currentSettings?.source !== 'institution'}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {[5, 10, 15, 20, 25, 30].map(val => (
              <option key={val} value={val}>{val} requests/min</option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            Range: 5 - 30 req/min. Maximum requests each student can make per minute.
          </p>
        </div>

        {/* Change Reason */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2C2C2A',
          }}>
            Reason for Change *
          </label>
          <textarea
            value={settings.change_reason}
            onChange={(e) => setSettings({ ...settings, change_reason: e.target.value })}
            placeholder="Explain why you're changing these settings..."
            disabled={currentSettings?.source !== 'institution'}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: "'DM Sans', sans-serif",
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Validation Warnings */}
        {validationResult && validationResult.warnings && validationResult.warnings.length > 0 && (
          <div style={{
            background: '#FFF4E5',
            border: '1px solid #FFE0B2',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
              <AlertTriangle size={18} style={{ color: '#F39C12', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '14px', color: '#8B5A00', marginBottom: '8px', display: 'block' }}>
                  Warnings:
                </strong>
                {validationResult.warnings.map((warning: string, i: number) => (
                  <div key={i} style={{ fontSize: '13px', color: '#8B5A00', marginBottom: '4px' }}>
                    • {warning}
                  </div>
                ))}
                {validationResult.quota_impact && (
                  <div style={{ fontSize: '13px', color: '#8B5A00', marginTop: '12px', fontStyle: 'italic' }}>
                    {validationResult.quota_impact}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationResult && validationResult.errors && validationResult.errors.length > 0 && (
          <div style={{
            background: '#FEE',
            border: '1px solid #FCC',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
              <AlertTriangle size={18} style={{ color: '#E74C3C', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '14px', color: '#C00', marginBottom: '8px', display: 'block' }}>
                  Errors:
                </strong>
                {validationResult.errors.map((error: string, i: number) => (
                  <div key={i} style={{ fontSize: '13px', color: '#800', marginBottom: '4px' }}>
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {showConfirmation && (
            <button
              onClick={() => setShowConfirmation(false)}
              style={{
                padding: '10px 20px',
                border: '1px solid #e5e4dc',
                borderRadius: '8px',
                background: 'white',
                color: '#888780',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={showConfirmation ? handleConfirmedSave : handleSave}
            disabled={loading || currentSettings?.source !== 'institution'}
            style={{
              padding: '10px 24px',
              border: 'none',
              borderRadius: '8px',
              background: showConfirmation ? '#E74C3C' : '#1D9E75',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (loading || currentSettings?.source !== 'institution') ? 'not-allowed' : 'pointer',
              opacity: (loading || currentSettings?.source !== 'institution') ? 0.5 : 1,
            }}
          >
            {loading ? 'Saving...' : showConfirmation ? 'Confirm Risky Change' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
