import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { DashboardStats } from '../types';
import { StatCard } from '../components/Dashboard/StatCard';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  CalendarX,
  Layers,
  TrendingUp,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToKanban: () => void;
  onNavigateToTasks: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToKanban,
  onNavigateToTasks,
}) => {
  const { activeProject } = useProject();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await api.dashboard.get(activeProject?.id);
        setStats(data);
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [activeProject]);

  if (isLoading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
        Loading dashboard analytics...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      {/* Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Tasks"
          value={stats.total_tasks}
          icon={Layers}
          subtext={`${stats.project_summaries?.length || 0} active projects`}
          color="#4f46e5"
          bgLight="#e0e7ff"
        />
        <StatCard
          label="Active"
          value={stats.active_tasks}
          icon={Clock}
          subtext="In Progress & Backlog"
          color="#0284c7"
          bgLight="#e0f2fe"
        />
        <StatCard
          label="Completed"
          value={stats.completed_tasks}
          icon={CheckCircle2}
          subtext={`${stats.completion_rate_pct}% completion rate`}
          color="#16a34a"
          bgLight="#dcfce7"
        />
        <StatCard
          label="Blocked"
          value={stats.blocked_tasks}
          icon={AlertOctagon}
          subtext="Requires intervention"
          color="#dc2626"
          bgLight="#fee2e2"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue_tasks}
          icon={CalendarX}
          subtext="Past target date"
          color="#d97706"
          bgLight="#fef3c7"
        />
      </div>

      {/* Analytics & Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Progress & Distributions Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Project Velocity & Status
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                color: '#16a34a',
              }}
            >
              <TrendingUp size={14} />
              {stats.completion_rate_pct}% Done
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: 10, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
            <div
              style={{
                height: '100%',
                width: `${stats.completion_rate_pct}%`,
                backgroundColor: 'var(--primary)',
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Status Breakdown */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>
            STATUS DISTRIBUTION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span className="badge badge-todo" style={{ marginBottom: 4 }}>TODO</span>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.by_status.TODO}</div>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span className="badge badge-in_progress" style={{ marginBottom: 4 }}>IN PROGRESS</span>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.by_status.IN_PROGRESS}</div>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span className="badge badge-blocked" style={{ marginBottom: 4 }}>BLOCKED</span>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.by_status.BLOCKED}</div>
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span className="badge badge-done" style={{ marginBottom: 4 }}>DONE</span>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.by_status.DONE}</div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={onNavigateToKanban} style={{ flex: 1 }}>
              Open Kanban Board
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onNavigateToTasks} style={{ flex: 1 }}>
              View All Tasks
            </button>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <ActivityFeed events={stats.recent_activity} />
      </div>
    </div>
  );
};
