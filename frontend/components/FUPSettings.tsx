import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function FUPSettings({ institutionId, currentSettings, onUpdate }: any) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
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

    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/settings/update`, {
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

      if (!res.ok) throw new Error(data.detail || 'Update failed');

      if (!data.success) {
        alert('Settings validation failed');
        return;
      }

      alert('Settings updated successfully!');
      onUpdate();
      setSettings({ ...settings, change_reason: '' });
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: '8px',
            background: '#1D9E75',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
