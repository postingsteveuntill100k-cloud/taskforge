import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.js';
import { useProject } from './context/ProjectContext.js';
import { AuthPage } from './pages/AuthPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { KanbanPage } from './pages/KanbanPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { Sidebar } from './components/Layout/Sidebar.js';
import { Navbar } from './components/Layout/Navbar.js';
import { ToastContainer } from './components/Layout/ToastContainer.js';
import { TaskCreateModal } from './components/Tasks/TaskCreateModal.js';
import { ProjectCreateModal } from './components/Projects/ProjectCreateModal.js';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { setActiveProject } = useProject();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState<boolean>(false);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'n') {
        e.preventDefault();
        setIsCreateTaskOpen(true);
      } else if (e.key === 'p') {
        e.preventDefault();
        setIsCreateProjectOpen(true);
      } else if (e.key === '1') {
        setCurrentTab('dashboard');
      } else if (e.key === '2') {
        setCurrentTab('kanban');
      } else if (e.key === '3') {
        setCurrentTab('tasks');
      } else if (e.key === '4') {
        setCurrentTab('projects');
      } else if (e.key === '5') {
        setCurrentTab('activity');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Connecting to TaskForge Workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Executive Dashboard';
      case 'kanban':
        return 'Project Kanban Board';
      case 'tasks':
        return 'Task Management';
      case 'projects':
        return 'Project Workspaces';
      case 'activity':
        return 'Activity Audit Stream';
      default:
        return 'TaskForge';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          title={getPageTitle()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigateToTasks={() => setCurrentTab('tasks')}
        />

        <main className="content-body">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateToKanban={() => setCurrentTab('kanban')}
              onNavigateToTasks={() => setCurrentTab('tasks')}
            />
          )}

          {currentTab === 'kanban' && <KanbanPage />}

          {currentTab === 'tasks' && <TasksPage initialSearchQuery={searchQuery} />}

          {currentTab === 'projects' && (
            <ProjectsPage
              onSelectProject={(project) => {
                setActiveProject(project);
                setCurrentTab('dashboard');
              }}
            />
          )}

          {currentTab === 'activity' && <ActivityPage />}
        </main>
      </div>

      {/* Modals */}
      <TaskCreateModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={() => {
          // Handled via state sync
        }}
      />

      <ProjectCreateModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
