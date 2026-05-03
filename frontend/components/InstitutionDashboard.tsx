import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Users, TrendingUp, Package, Clock, AlertCircle, User, ShoppingCart } from 'lucide-react';
import { StudentManagement } from './StudentManagement';
import { FUPSettings } from './FUPSettings';
import { ActivityLog } from './ActivityLog';
import { PurchaseMAUModal } from './PurchaseMAUModal';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

interface DashboardProps {
  institutionId: string;
}

export function InstitutionDashboard({ institutionId }: DashboardProps) {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mauStatus, setMauStatus] = useState<any>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  useEffect(() => {
    loadDashboard();
    loadMAUStatus();
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
  
  const loadMAUStatus = async () => {
    console.log('🔍 Loading MAU status for institution:', institutionId); 
    try {
      const res = await fetch(`${API_BASE_URL}/api/institution/${institutionId}/mau-status`);
      const result = await res.json();
      console.log('✅ MAU Status loaded:', result);
      console.log('📊 Usage Percent:', result?.usage_percent);
      setMauStatus(result);
    } catch (err) {
      console.error('❌ Failed to load MAU status:', err);
    }
  };
  
  const handlePurchaseSuccess = () => {
    loadDashboard();
    loadMAUStatus();
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
            { id: 'profile', label: 'Profile' },
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
          {activeTab === 'overview' && (
            <div>
              {/* MAU Status Card */}
              {mauStatus && (
                <div style={{
                  background: mauStatus.usage_percent > 80 ? '#FFF4E5' : '#E6F1FB',
                  border: `1px solid ${mauStatus.usage_percent > 80 ? '#FFE0B2' : '#D0E7F9'}`,
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} style={{ color: mauStatus.usage_percent > 80 ? '#F39C12' : '#378ADD' }} />
                        Monthly Active Users (MAU)
                      </h3>
                      <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                        Current capacity and usage of active students
                      </p>
                    </div>
                    {mauStatus.usage_percent >= 0 && (
                      <button
                        onClick={() => setShowPurchaseModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: '#1D9E75',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <ShoppingCart size={16} />
                        Buy More Readers
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Active Students</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: mauStatus.usage_percent > 80 ? '#F39C12' : '#378ADD' }}>
                        {mauStatus.active_users} <span style={{ fontSize: '18px', fontWeight: '400', color: '#888780' }}>/ {mauStatus.total_capacity}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        {mauStatus.usage_percent}% capacity used
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Free Included</div>
                      <div style={{ fontSize: '24px', fontWeight: '600' }}>{mauStatus.free_users_limit}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Additional Purchased</div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#1D9E75' }}>
                        +{mauStatus.additional_purchased}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ 
                    background: 'rgba(0,0,0,0.1)', 
                    height: '8px', 
                    borderRadius: '4px', 
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      width: `${Math.min(mauStatus.usage_percent, 100)}%`,
                      height: '100%',
                      background: mauStatus.usage_percent > 90 ? '#E74C3C' : mauStatus.usage_percent > 80 ? '#F39C12' : '#1D9E75',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {mauStatus.usage_percent > 80 && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: mauStatus.usage_percent > 90 ? '#C0392B' : '#8B5A00',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertCircle size={14} />
                      {mauStatus.usage_percent > 90 
                        ? '⚠️ Critical: Approaching capacity limit! Purchase additional readers to avoid blocking new students.'
                        : '⚠️ Warning: You\'re using over 80% of your capacity. Consider purchasing additional readers.'}
                    </div>
                  )}

                  {mauStatus.additional_purchased > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                        💡 Price: ₹{mauStatus.price_per_reader} per additional reader
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '14px', color: '#888780' }}>
                Detailed usage analytics coming soon
              </div>
            </div>
          )}
          {activeTab === 'students' && <StudentManagement institutionId={institutionId} />}
          {activeTab === 'settings' && <FUPSettings institutionId={institutionId} currentSettings={data.settings} onUpdate={loadDashboard} />}
          {activeTab === 'activity' && <ActivityLog activity={activity} />}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Institution Profile</h2>
              
              {/* Institution Details */}
              <div style={{ background: '#f9f9f7', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} style={{ color: '#378ADD' }} />
                  Institution Details
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Institution Name</div>
                    <div style={{ fontSize: '15px', fontWeight: '500' }}>{data.institution?.name || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>City</div>
                      <div style={{ fontSize: '15px' }}>{data.institution?.city || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>State</div>
                      <div style={{ fontSize: '15px' }}>{data.institution?.state || 'N/A'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Address</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.address_line1 || 'N/A'}</div>
                    {data.institution?.address_line2 && (
                      <div style={{ fontSize: '15px', marginTop: '2px' }}>{data.institution.address_line2}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Contact Person */}
              <div style={{ background: '#f9f9f7', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Contact Person</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Name</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.contact_person_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Designation</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.contact_person_designation || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.contact_email || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Phone</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.contact_phone || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              {/* Head of Institution */}
              <div style={{ background: '#f9f9f7', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Head of Institution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Name</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.head_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Designation</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.head_designation || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Email</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.head_email || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>Phone</div>
                    <div style={{ fontSize: '15px' }}>{data.institution?.head_phone || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              {/* Subscription Details */}
              <div style={{ background: '#E6F1FB', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} style={{ color: '#378ADD' }} />
                  Subscription Details
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Package</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#378ADD' }}>{subscription.package_name || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75' }}>Active</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Input Tokens</div>
                      <div style={{ fontSize: '15px' }}>
                        {(subscription.input_tokens_allocated / 1000000000).toFixed(2)}B allocated
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {(subscription.input_tokens_used / 1000000000).toFixed(2)}B used
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Output Tokens</div>
                      <div style={{ fontSize: '15px' }}>
                        {(subscription.output_tokens_allocated / 1000000).toFixed(0)}M allocated
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {(subscription.output_tokens_used / 1000000).toFixed(0)}M used
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Free Readers</div>
                      <div style={{ fontSize: '15px' }}>{subscription.free_users_limit || 0} students</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Subscription Period</div>
                      <div style={{ fontSize: '15px' }}>
                        {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString() : 'N/A'} - {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Purchase MAU Modal */}
      {showPurchaseModal && mauStatus && user && (
        <PurchaseMAUModal
          institutionId={institutionId}
          adminUserId={user.id}
          adminName={user.fullName || 'Admin'}
          currentCapacity={mauStatus.total_capacity}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
