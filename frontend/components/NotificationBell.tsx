import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';

interface NotificationBellProps {
  userId: string;
  userRole: 'reader' | 'institution' | 'publisher' | 'platform_admin';
}

export function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          user_id: userId,
        }),
      });
      loadNotifications(); // Reload
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await fetch(`/api/notifications/mark-all-read/${userId}`, {
        method: 'POST',
      });
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}?user_id=${userId}`, {
        method: 'DELETE',
      });
      loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to action URL if present
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderRadius: '8px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f3'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={20} style={{ color: '#2C2C2A' }} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#E74C3C',
            color: 'white',
            fontSize: '10px',
            fontWeight: '600',
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '16px',
            textAlign: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* Notification Panel */}
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxHeight: '500px',
            background: 'white',
            border: '1px solid #e5e4dc',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            zIndex: 1000,
            overflow: 'hidden',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e5e4dc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2C2C2A',
                margin: 0,
              }}>
                Notifications
              </h3>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  style={{
                    fontSize: '12px',
                    color: '#378ADD',
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#888780',
                  fontSize: '14px',
                }}>
                  <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No notifications yet</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f5f5f3',
                      background: notif.is_read ? 'white' : '#F0F9FF',
                      cursor: notif.action_url ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (notif.action_url) {
                        e.currentTarget.style.background = notif.is_read ? '#f9f9f7' : '#E6F4FF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.is_read ? 'white' : '#F0F9FF';
                    }}
                  >
                    {/* Unread Indicator */}
                    {!notif.is_read && (
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        top: '20px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#378ADD',
                      }} />
                    )}

                    <div style={{ marginLeft: notif.is_read ? '0' : '16px' }}>
                      {/* Title */}
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#2C2C2A',
                        marginBottom: '4px',
                      }}>
                        {notif.title}
                      </div>

                      {/* Message */}
                      <div style={{
                        fontSize: '13px',
                        color: '#888780',
                        lineHeight: '1.5',
                        marginBottom: '8px',
                      }}>
                        {notif.message}
                      </div>

                      {/* Footer */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        {/* Time */}
                        <span style={{
                          fontSize: '11px',
                          color: '#AAA9A0',
                        }}>
                          {new Date(notif.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>

                        {/* Action Button */}
                        {notif.action_label && notif.action_url && (
                          <span style={{
                            fontSize: '12px',
                            color: '#378ADD',
                            fontWeight: '500',
                          }}>
                            {notif.action_label} →
                          </span>
                        )}

                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          style={{
                            padding: '4px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            opacity: 0.5,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                        >
                          <X size={14} style={{ color: '#888780' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding: '12px',
                borderTop: '1px solid #e5e4dc',
                textAlign: 'center',
              }}>
                <a
                  href="/notifications"
                  style={{
                    fontSize: '13px',
                    color: '#378ADD',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
