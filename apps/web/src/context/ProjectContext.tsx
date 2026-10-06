import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { CreateProjectDto, Project, UpdateProjectDto } from '../types/index.js';
import { useAuth } from './AuthContext.js';
import { useToast } from './ToastContext.js';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  setActiveProject: (project: Project) => void;
  refreshProjects: () => Promise<void>;
  createProject: (dto: CreateProjectDto) => Promise<Project>;
  updateProject: (id: string, dto: UpdateProjectDto) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const list = await api.projects.list();
      setProjects(list);
      // If no active project or active project is no longer in list, set first
      setActiveProjectState((current) => {
        if (!current && list.length > 0) {
          return list[0];
        }
        if (current) {
          const match = list.find((p) => p.id === current.id);
          return match || (list.length > 0 ? list[0] : null);
        }
        return null;
      });
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, addToast]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProjects();
    } else {
      setProjects([]);
      setActiveProjectState(null);
    }
  }, [isAuthenticated, refreshProjects]);

  const setActiveProject = (p: Project) => {
    setActiveProjectState(p);
  };

  const createProject = async (dto: CreateProjectDto): Promise<Project> => {
    try {
      const newProject = await api.projects.create(dto);
      addToast('success', `Project "${newProject.name}" created!`);
      await refreshProjects();
      setActiveProjectState(newProject);
      return newProject;
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create project.');
      throw err;
    }
  };

  const updateProject = async (id: string, dto: UpdateProjectDto): Promise<Project> => {
    try {
      const updated = await api.projects.update(id, dto);
      addToast('success', `Project updated.`);
      await refreshProjects();
      return updated;
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update project.');
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      await api.projects.delete(id);
      addToast('info', 'Project deleted.');
      await refreshProjects();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete project.');
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        isLoading,
        setActiveProject,
        refreshProjects,
        createProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
