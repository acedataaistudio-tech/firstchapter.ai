import { Activity, User, Settings, Check, X, AlertCircle } from 'lucide-react';

interface ActivityLogProps {
  activity: any[];
}

export function ActivityLog({ activity }: ActivityLogProps) {
  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'student_approved':
        return <Check size={16} style={{ color: '#1D9E75' }} />;
      case 'student_rejected':
        return <X size={16} style={{ color: '#E74C3C' }} />;
      case 'settings_updated':
        return <Settings size={16} style={{ color: '#378ADD' }} />;
      default:
        return <Activity size={16} style={{ color: '#888780' }} />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'student_approved':
        return '#E1F5EE';
      case 'student_rejected':
        return '#FEE';
      case 'settings_updated':
        return '#E6F4FF';
      default:
        return '#f5f5f3';
    }
  };

  if (!activity || activity.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#888780',
      }}>
        <Activity size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p style={{ fontSize: '14px' }}>No activity yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Recent Activity
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}>
        {activity.map((item, index) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px 0',
              borderBottom: index < activity.length - 1 ? '1px solid #f5f5f3' : 'none',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: getActivityColor(item.action_type),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {getActivityIcon(item.action_type)}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              {/* Action Description */}
              <div style={{
                fontSize: '14px',
                color: '#2C2C2A',
                marginBottom: '4px',
              }}>
                {item.action_description}
              </div>

              {/* Performed By */}
              <div style={{
                fontSize: '12px',
                color: '#888780',
              }}>
                by {item.performed_by_name || 'Admin'}
              </div>

              {/* Details (if any) */}
              {item.details && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#888780',
                  background: '#f9f9f7',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                }}>
                  {typeof item.details === 'string' 
                    ? item.details 
                    : JSON.stringify(item.details, null, 2)}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div style={{
              fontSize: '11px',
              color: '#AAA9A0',
              flexShrink: 0,
              textAlign: 'right',
            }}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
