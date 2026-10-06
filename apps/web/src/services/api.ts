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
  Task,
  TaskPriority,
  TaskStatus,
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
}

export const api = new ApiClient();
