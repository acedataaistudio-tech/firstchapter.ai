// components/InstitutionDashboard.tsx

import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Package, Settings, Activity, 
  AlertCircle, Clock, CheckCircle, XCircle, Bell 
} from 'lucide-react';

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
      const res = await fetch(`/api/institution/${institutionId}/dashboard`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !data) {
    return <div>Loading dashboard...</div>;
  }
  
  const { institution, subscription, settings, students, activity, usage_trends, alerts } = data;
  
  return (
    <div style={{ padding: '24px' }}>
      {/* Header Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Total Students */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Total Students</span>
            <Users size={18} style={{ color: '#378ADD' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2C2C2A' }}>
            {students.total}
          </div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            {students.active} active, {students.pending} pending
          </div>
        </div>
        
        {/* Token Usage */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Token Usage</span>
            <TrendingUp size={18} style={{ color: '#1D9E75' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2C2C2A' }}>
            {subscription.usage_percent}%
          </div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            {(subscription.total_used / 1000000).toFixed(1)}M / {(subscription.total_allocated / 1000000).toFixed(1)}M tokens
          </div>
          <div style={{
            marginTop: '8px',
            height: '4px',
            background: '#e5e4dc',
            borderRadius: '2px',
          }}>
            <div style={{
              width: `${Math.min(subscription.usage_percent, 100)}%`,
              height: '100%',
              background: subscription.usage_percent >= 90 ? '#E74C3C' : 
                         subscription.usage_percent >= 80 ? '#F39C12' : '#1D9E75',
              borderRadius: '2px',
            }} />
          </div>
        </div>
        
        {/* Package */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Current Package</span>
            <Package size={18} style={{ color: '#9B59B6' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#2C2C2A' }}>
            {subscription.package_name}
          </div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            {subscription.trial_mode ? `Trial until ${new Date(subscription.trial_until).toLocaleDateString()}` : 'Active'}
          </div>
        </div>
        
        {/* Pending Approvals */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#888780' }}>Pending Approvals</span>
            <Clock size={18} style={{ color: '#F39C12' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#2C2C2A' }}>
            {students.pending}
          </div>
          <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
            Requires action
          </div>
        </div>
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{
          background: '#FFF4E5',
          border: '1px solid #FFE0B2',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
            <AlertCircle size={20} style={{ color: '#F39C12', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#8B5A00', marginBottom: '8px' }}>
                Quota Alerts
              </h4>
              {alerts.slice(0, 3).map((alert: any) => (
                <div key={alert.id} style={{ fontSize: '13px', color: '#8B5A00', marginBottom: '4px' }}>
                  • {alert.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e4dc',
      }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e4dc',
          padding: '0 20px',
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'students', label: 'Students' },
            { id: 'settings', label: 'FUP Controls' },
            { id: 'activity', label: 'Activity Log' },
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
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Usage Trends (Last 30 Days)
              </h3>
              {/* Usage chart would go here */}
              <div style={{ fontSize: '14px', color: '#888780' }}>
                Daily token consumption chart
              </div>
            </div>
          )}
          
          {activeTab === 'students' && (
            <StudentManagement institutionId={institutionId} />
          )}
          
          {activeTab === 'settings' && (
            <FUPSettings 
              institutionId={institutionId}
              currentSettings={settings}
              onUpdate={loadDashboard}
            />
          )}
          
          {activeTab === 'activity' && (
            <ActivityLog activity={activity} />
          )}
        </div>
      </div>
    </div>
  );
}
```
