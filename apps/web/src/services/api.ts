import {
  AuthResponse,
  Comment,
  CreateCommentDto,
  CreateProjectDto,
  CreateTaskDto,
  DashboardStats,
  LoginDto,
  Notification,
  Project,
  ProjectMember,
  RegisterDto,
  SearchQueryDto,
  Subtask,
  CreateSubtaskDto,
  UpdateSubtaskDto,
  Task,
  TaskPriority,
  TaskStatus,
  Tag,
  TagWithCount,
  CreateTagDto,
  UpdateTagDto,
  UpdateCommentDto,
  UpdateProjectDto,
  UpdateTaskDto,
  UserSafe,
} from '../types/index.js';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('taskforge_token');
  }

  private setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('taskforge_token', token);
    } else {
      localStorage.removeItem('taskforge_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      this.setToken(null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Fallback
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  auth = {
    login: async (dto: LoginDto): Promise<AuthResponse> => {
      const res = await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      this.setToken(res.token);
      return res;
    },
    register: async (dto: RegisterDto): Promise<AuthResponse> => {
      const res = await this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      this.setToken(res.token);
      return res;
    },
    logout: async (): Promise<void> => {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } finally {
        this.setToken(null);
      }
    },
    me: async (): Promise<UserSafe> => {
      return this.request<UserSafe>('/auth/me');
    },
    updateProfile: async (dto: any): Promise<UserSafe> => {
      return this.request<UserSafe>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    hasToken: (): boolean => {
      return Boolean(this.getToken());
    },
  };

  // Users
  users = {
    list: async (query?: string): Promise<UserSafe[]> => {
      return this.request<UserSafe[]>(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    },
  };

  // Projects
  projects = {
    list: async (): Promise<Project[]> => {
      return this.request<Project[]>('/projects');
    },
    get: async (id: string): Promise<Project & { members: ProjectMember[] }> => {
      return this.request<Project & { members: ProjectMember[] }>(`/projects/${id}`);
    },
    create: async (dto: CreateProjectDto): Promise<Project> => {
      return this.request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    update: async (id: string, dto: UpdateProjectDto): Promise<Project> => {
      return this.request<Project>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    delete: async (id: string): Promise<void> => {
      return this.request(`/projects/${id}`, { method: 'DELETE' });
    },
    listMembers: async (projectId: string): Promise<ProjectMember[]> => {
      return this.request<ProjectMember[]>(`/projects/${projectId}/members`);
    },
    addMember: async (projectId: string, dto: any): Promise<ProjectMember> => {
      return this.request<ProjectMember>(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    updateMemberRole: async (projectId: string, userId: string, role: string): Promise<ProjectMember> => {
      return this.request<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },
    removeMember: async (projectId: string, userId: string): Promise<void> => {
      return this.request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
    },
    exportJson: async (id: string): Promise<any> => {
      return this.request(`/projects/${id}/export`);
    },
    exportCsv: async (id: string): Promise<string> => {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/projects/${id}/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.text();
    },
    exportAuditCsv: async (id: string, options?: { startDate?: string; endDate?: string }): Promise<string> => {
      const token = this.getToken();
      const params = new URLSearchParams();
      if (options?.startDate) params.set('startDate', options.startDate);
      if (options?.endDate) params.set('endDate', options.endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/projects/${id}/audit-export${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Audit export failed: ${res.statusText}`);
      return res.text();
    },
    validateAuditCsv: async (id: string, csv: string): Promise<{ valid: boolean; errors: string[]; rowCount: number }> => {
      return this.request<{ valid: boolean; errors: string[]; rowCount: number }>(`/projects/${id}/audit-export/validate`, {
        method: 'POST',
        body: JSON.stringify({ csv }),
      });
    },
    import: async (bundle: any): Promise<Project> => {
      return this.request<Project>('/projects/import', {
        method: 'POST',
        body: JSON.stringify(bundle),
      });
    },
  };

  // Saved Filters
  savedFilters = {
    list: async (projectId?: string): Promise<any[]> => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return this.request<any[]>(`/saved-filters${qs}`);
    },
    create: async (dto: { name: string; project_id: string; filter_config: any }): Promise<any> => {
      return this.request<any>('/saved-filters', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    delete: async (id: string): Promise<void> => {
      return this.request(`/saved-filters/${id}`, { method: 'DELETE' });
    },
  };

  // System Telemetry & Metrics
  metrics = {
    get: async (): Promise<any> => {
      return this.request<any>('/metrics');
    },
  };

  // Tasks
  tasks = {
    list: async (filters: {
      projectId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      tag?: string;
      search?: string;
      sort?: string;
    } = {}): Promise<Task[]> => {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters.tag) params.set('tag', filters.tag);
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);

      const qs = params.toString();
      return this.request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
    },
    get: async (id: string): Promise<Task> => {
      return this.request<Task>(`/tasks/${id}`);
    },
    create: async (dto: CreateTaskDto): Promise<Task> => {
      return this.request<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    update: async (id: string, dto: UpdateTaskDto): Promise<Task> => {
      return this.request<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    delete: async (id: string): Promise<void> => {
      return this.request(`/tasks/${id}`, { method: 'DELETE' });
    },
    reorder: async (updates: Array<{ id: string; status: TaskStatus; position: number }>): Promise<void> => {
      return this.request('/tasks/reorder', {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
    },
    listComments: async (taskId: string): Promise<Comment[]> => {
      return this.request<Comment[]>(`/tasks/${taskId}/comments`);
    },
    addComment: async (taskId: string, dto: CreateCommentDto): Promise<Comment> => {
      return this.request<Comment>(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    listSubtasks: async (taskId: string): Promise<Subtask[]> => {
      return this.request<Subtask[]>(`/tasks/${taskId}/subtasks`);
    },
    addSubtask: async (taskId: string, dto: CreateSubtaskDto): Promise<Subtask> => {
      return this.request<Subtask>(`/tasks/${taskId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    updateSubtask: async (taskId: string, subtaskId: string, dto: UpdateSubtaskDto): Promise<Subtask> => {
      return this.request<Subtask>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
      return this.request(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' });
    },
  };

  // Comments
  comments = {
    update: async (id: string, dto: UpdateCommentDto): Promise<Comment> => {
      return this.request<Comment>(`/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    delete: async (id: string): Promise<void> => {
      return this.request(`/comments/${id}`, { method: 'DELETE' });
    },
  };

  // Dashboard
  dashboard = {
    get: async (projectId?: string): Promise<DashboardStats> => {
      const qs = projectId ? `?projectId=${projectId}` : '';
      return this.request<DashboardStats>(`/dashboard${qs}`);
    },
  };

  // Search
  search = {
    query: async (queryDto: SearchQueryDto): Promise<{ tasks: Task[]; projects: Project[]; total_matches: number }> => {
      const params = new URLSearchParams();
      if (queryDto.q) params.set('q', queryDto.q);
      if (queryDto.projectId) params.set('projectId', queryDto.projectId);
      if (queryDto.status) params.set('status', queryDto.status);
      if (queryDto.priority) params.set('priority', queryDto.priority);
      if (queryDto.assigneeId) params.set('assigneeId', queryDto.assigneeId);
      if (queryDto.tag) params.set('tag', queryDto.tag);

      return this.request(`/search?${params.toString()}`);
    },
  };

  // Activity
  activity = {
    list: async (options: { projectId?: string; taskId?: string; limit?: number } = {}): Promise<any[]> => {
      const params = new URLSearchParams();
      if (options.projectId) params.set('projectId', options.projectId);
      if (options.taskId) params.set('taskId', options.taskId);
      if (options.limit) params.set('limit', String(options.limit));

      return this.request(`/activity?${params.toString()}`);
    },
  };

  // Notifications
  notifications = {
    list: async (): Promise<Notification[]> => {
      return this.request<Notification[]>('/notifications');
    },
    markAsRead: async (id: string): Promise<void> => {
      return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
    },
    markAllAsRead: async (): Promise<void> => {
      return this.request('/notifications/read-all', { method: 'POST' });
    },
  };

  // Tags & Labels
  tags = {
    list: async (projectId: string): Promise<TagWithCount[]> => {
      return this.request<TagWithCount[]>(`/projects/${projectId}/tags`);
    },
    create: async (projectId: string, dto: CreateTagDto): Promise<Tag> => {
      return this.request<Tag>(`/projects/${projectId}/tags`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    update: async (projectId: string, tagId: string, dto: UpdateTagDto): Promise<Tag> => {
      return this.request<Tag>(`/projects/${projectId}/tags/${tagId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });
    },
    delete: async (projectId: string, tagId: string): Promise<void> => {
      return this.request(`/projects/${projectId}/tags/${tagId}`, {
        method: 'DELETE',
      });
    },
  };
}

export const api = new ApiClient();
