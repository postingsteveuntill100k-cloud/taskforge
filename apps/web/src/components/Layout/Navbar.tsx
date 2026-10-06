import React, { useState, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
import { api } from '../../services/api';
import { Notification } from '../../types';
import { useProject } from '../../context/ProjectContext';

interface NavbarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateToTasks: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  searchQuery,
  onSearchChange,
  onNavigateToTasks,
}) => {
  const { activeProject } = useProject();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = await api.notifications.list();
        setNotifications(notifs);
      } catch {
        // Silently ignore notification fetch error on startup
      }
    };

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // ignore
    }
  };

  return (
    <header className="topbar">
      {/* Title & Project context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h1>
        {activeProject && (
          <span
            style={{
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: '#e0e7ff',
              color: '#3730a3',
              fontWeight: 600,
            }}
          >
            {activeProject.name}
          </span>
        )}
      </div>

      {/* Global Search and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search tasks, descriptions..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (e.target.value.trim().length > 0) {
                onNavigateToTasks();
              }
            }}
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              outline: 'none',
              backgroundColor: '#f8fafc',
            }}
          />
        </div>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{
              position: 'relative',
              padding: 8,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 42,
                width: 320,
                backgroundColor: '#ffffff',
                borderRadius: 10,
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                zIndex: 60,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>Notifications</div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: n.is_read ? '#ffffff' : '#f0fdf4',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
