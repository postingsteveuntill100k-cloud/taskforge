import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { ActivityEvent } from '../types';
import { CheckCircle2, PlusCircle, MessageSquare, FolderPlus, RefreshCw, Download } from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { activeProject } = useProject();
  const { addToast } = useToast();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filterProject, setFilterProject] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const list = await api.activity.list({
          projectId: filterProject ? activeProject?.id : undefined,
          limit: 100,
        });
        setEvents(list);
      } catch {
        // Silently handle
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [activeProject, filterProject]);

  const handleExportAuditCsv = async () => {
    if (!activeProject) {
      addToast('error', 'Please select an active project to export its audit log.');
      return;
    }
    setIsExporting(true);
    try {
      const csv = await api.projects.exportAuditCsv(activeProject.id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Audit log CSV exported successfully.');
    } catch {
      addToast('error', 'Failed to export audit log CSV.');
    } finally {
      setIsExporting(false);
    }
  };

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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Activity Timeline</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Real-time audit log of project operations, task updates, and collaboration events.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportAuditCsv}
            disabled={isExporting || !activeProject}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }}
            title="Export project audit trail as CSV"
          >
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Export Audit CSV'}
          </button>

          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filterProject}
              onChange={(e) => setFilterProject(e.target.checked)}
            />
            Filter by active project only
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: '8px 24px' }}>
        {isLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading activity log...
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No activity events recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((e, idx) => (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px 0',
                  borderBottom: idx < events.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ marginTop: 2 }}>{getEventIcon(e.event_type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {e.description}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{e.user?.name || 'System'}</span>
                    <span>•</span>
                    <span>
                      {new Date(e.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {e.task_title && (
                      <>
                        <span>•</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                          {e.task_title}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
