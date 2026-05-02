import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function NotificationBell({ userId, userRole }: { userId: string; userRole: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${userId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, user_id: userId }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#E74C3C',
            color: 'white',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '10px',
          }}>
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }} />
          
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
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e4dc' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Notifications</h3>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888780' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f5f5f3',
                      background: notif.is_read ? 'white' : '#F0F9FF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#888780' }}>
                      {notif.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
