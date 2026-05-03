
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { Clock, Check, X, Users, Package, Mail, Phone } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';
const ADMIN_SECRET = 'firstchapter@admin2026';

export default function PlatformAdminInstitutions() {
  const { user } = useUser();
  const router = useRouter();
  
  // Authentication
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Data
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const handleLogin = () => {
    if (password === ADMIN_SECRET) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/institutions/list?status=${filter}`, {
        headers: {
          'x-admin-secret': ADMIN_SECRET,
        },
      });
      const data = await res.json();
      setApplications(data.institutions || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (institutionId: string, packageId: string, packageName: string) => {
    if (!confirm('Approve this institution? This will create their subscription.')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/institutions/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
        body: JSON.stringify({
          institution_id: institutionId,
          action: 'approve',
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
          package_id: packageId,
        }),
      });

      if (!res.ok) throw new Error('Approval failed');

      alert('Institution approved and subscription created!');
      loadApplications();
    } catch (err: any) {
      console.error('Approval error:', err);
      alert(`Failed to approve institution: ${err.message}`);
    }
  };

  const handleReject = async (institutionId: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/institutions/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': ADMIN_SECRET,
        },
        body: JSON.stringify({
          institution_id: institutionId,
          action: 'reject',
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
          rejection_reason: reason,
        }),
      });

      if (!res.ok) throw new Error('Rejection failed');

      alert('Institution application rejected');
      loadApplications();
    } catch (err: any) {
      console.error('Rejection error:', err);
      alert(`Failed to reject institution: ${err.message}`);
    }
  };

  return (
    <>
      {/* Password Login Screen */}
      {!authenticated ? (
        <div style={{ 
          minHeight: '100vh', 
          background: '#f9f9f7', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif"
        }}>
          <div style={{ width: '380px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ 
                fontFamily: "'DM Serif Display', serif", 
                fontSize: '28px', 
                color: '#2C2C2A', 
                margin: '0 0 8px' 
              }}>
                First<span style={{ color: '#1D9E75' }}>chapter</span>
              </h1>
              <p style={{ fontSize: '14px', color: '#888780', margin: 0 }}>
                Admin access only
              </p>
            </div>
            
            <div style={{ 
              background: 'white', 
              border: '0.5px solid #e5e4dc', 
              borderRadius: '16px', 
              padding: '32px' 
            }}>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#2C2C2A', 
                margin: '0 0 20px' 
              }}>
                Enter admin password
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <input 
                  type="password" 
                  placeholder="Admin password" 
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ 
                    width: '100%',
                    padding: '12px',
                    border: passwordError ? '1px solid #E24B4A' : '0.5px solid #e5e4dc',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: "'DM Sans', sans-serif"
                  }} 
                />
                {passwordError && (
                  <p style={{ fontSize: '12px', color: '#E24B4A', margin: '6px 0 0' }}>
                    Incorrect password.
                  </p>
                )}
              </div>
              
              <button 
                onClick={handleLogin} 
                style={{ 
                  width: '100%', 
                  background: '#2C2C2A', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '100px', 
                  padding: '13px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                Access admin dashboard →
              </button>
              
              <button 
                onClick={() => router.push('/')} 
                style={{ 
                  width: '100%', 
                  background: 'none', 
                  border: 'none', 
                  color: '#888780', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  marginTop: '12px'
                }}
              >
                ← Back to platform
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Admin Content */
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Institution Applications
        </h1>
        <p style={{ fontSize: '15px', color: '#888780' }}>
          Review and approve pending institution applications
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              border: filter === status ? '1px solid #1D9E75' : '1px solid #e5e4dc',
              borderRadius: '8px',
              background: filter === status ? '#E1F5EE' : 'white',
              color: filter === status ? '#1D9E75' : '#888780',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: filter === status ? '600' : '400',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div>Loading...</div>
      ) : applications.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#888780',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e4dc',
        }}>
          No {filter} applications
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {applications.map((app) => (
            <div
              key={app.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e4dc',
                padding: '24px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px' }}>
                {/* Left: Institution Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                      {app.name}
                    </h3>
                    {app.application_status === 'pending' && (
                      <div style={{
                        padding: '4px 12px',
                        background: '#FFF4E5',
                        color: '#F39C12',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        Pending
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>
                        <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Contact
                      </div>
                      <div style={{ fontSize: '14px' }}>{app.contact_person_name}</div>
                      <div style={{ fontSize: '13px', color: '#888780' }}>{app.contact_email}</div>
                      <div style={{ fontSize: '13px', color: '#888780' }}>{app.contact_phone}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>
                        <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Head of Institution
                      </div>
                      <div style={{ fontSize: '14px' }}>{app.head_name}</div>
                      <div style={{ fontSize: '13px', color: '#888780' }}>{app.head_designation}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>
                        <Package size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Package Requested
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{app.requested_package_name}</div>
                      <div style={{ fontSize: '13px', color: '#888780' }}>
                        Est. {app.estimated_students} students
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#888780' }}>
                    Applied: {new Date(app.application_submitted_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Right: Actions */}
                {app.application_status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                    <button
                      onClick={() => handleApprove(app.id, app.requested_package_id, app.requested_package_name)}
                      style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#1D9E75',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Check size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      style={{
                        padding: '10px 20px',
                        border: '1px solid #e5e4dc',
                        borderRadius: '8px',
                        background: 'white',
                        color: '#E74C3C',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
      )}
    </>
  );
}
