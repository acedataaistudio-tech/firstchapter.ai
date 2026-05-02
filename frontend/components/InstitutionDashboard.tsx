import { useState, useEffect } from 'react';
import { Users, TrendingUp, Package, Clock, AlertCircle } from 'lucide-react';
import { StudentManagement } from './StudentManagement';
import { FUPSettings } from './FUPSettings';
import { ActivityLog } from './ActivityLog';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

interface DashboardProps {
  institutionId: string;
}

export function InstitutionDashboard({ institutionId }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    loadDashboard();
  }, [institutionId]);
  
  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/${institutionId}/dashboard`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !data) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;
  }
  
  const { subscription, students, activity, alerts } = data;
  
  return (
    <div style={{ padding: '24px' }}>
      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e4dc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Total Students</span>
            <Users size={18} style={{ color: '#378ADD' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{students.total}</div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            {students.active} active, {students.pending} pending
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e4dc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Token Usage</span>
            <TrendingUp size={18} style={{ color: '#1D9E75' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{subscription.usage_percent}%</div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            {(subscription.total_used / 1000000).toFixed(1)}M / {(subscription.total_allocated / 1000000).toFixed(1)}M tokens
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e4dc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Package</span>
            <Package size={18} style={{ color: '#9B59B6' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>{subscription.package_name || 'N/A'}</div>
        </div>
        
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e4dc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Pending Approvals</span>
            <Clock size={18} style={{ color: '#F39C12' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{students.pending}</div>
        </div>
      </div>
      
      {alerts && alerts.length > 0 && (
        <div style={{ background: '#FFF4E5', border: '1px solid #FFE0B2', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <AlertCircle size={20} style={{ color: '#F39C12' }} />
          <div style={{ marginLeft: '8px', display: 'inline-block' }}>
            {alerts.slice(0, 3).map((alert: any) => (
              <div key={alert.id} style={{ fontSize: '13px', color: '#8B5A00' }}>• {alert.message}</div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e4dc' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e4dc', padding: '0 20px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'students', label: 'Students' },
            { id: 'settings', label: 'Settings' },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #1D9E75' : 'none',
                color: activeTab === tab.id ? '#1D9E75' : '#888780',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div style={{ padding: '24px' }}>
          {activeTab === 'overview' && <div>Usage overview coming soon</div>}
          {activeTab === 'students' && <StudentManagement institutionId={institutionId} />}
          {activeTab === 'settings' && <FUPSettings institutionId={institutionId} currentSettings={data.settings} onUpdate={loadDashboard} />}
          {activeTab === 'activity' && <ActivityLog activity={activity} />}
        </div>
      </div>
    </div>
  );
}
