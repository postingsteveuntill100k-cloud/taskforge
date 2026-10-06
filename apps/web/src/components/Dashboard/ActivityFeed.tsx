import React from 'react';
import { ActivityEvent } from '../../types';
import { CheckCircle2, PlusCircle, MessageSquare, RefreshCw, FolderPlus } from 'lucide-react';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  const getEventIcon = (type: ActivityEvent['event_type']) => {
    switch (type) {
      case 'TASK_COMPLETED':
        return <CheckCircle2 size={16} color="#16a34a" />;
      case 'TASK_CREATED':
        return <PlusCircle size={16} color="#4f46e5" />;
      case 'COMMENT_ADDED':
        return <MessageSquare size={16} color="#0284c7" />;
      case 'PROJECT_CREATED':
        return <FolderPlus size={16} color="#d97706" />;
      default:
        return <RefreshCw size={16} color="#64748b" />;
    }
  };

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Recent Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '16px 0' }}>
            No recent activity recorded yet.
          </div>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ marginTop: 2 }}>{getEventIcon(e.event_type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {e.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(e.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
