export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type UserRole = 'ADMIN' | 'MEMBER';

export type ActivityEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_ASSIGNED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_ARCHIVED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'SUBTASK_CREATED'
  | 'SUBTASK_TOGGLED'
  | 'SUBTASK_DELETED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserSafe {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_archived: number;
  color: string;
  created_at: string;
  updated_at: string;
  owner?: UserSafe;
  member_count?: number;
  task_count?: number;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  user?: UserSafe;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  creator_id: string;
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  creator?: UserSafe;
  assignee?: UserSafe | null;
  tags?: Tag[];
  comments_count?: number;
  subtasks_count?: number;
  completed_subtasks_count?: number;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: UserSafe;
}

export interface ActivityEvent {
  id: string;
  project_id: string;
  task_id: string | null;
  user_id: string;
  event_type: ActivityEventType;
  description: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  user?: UserSafe;
  task_title?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: number;
  link: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  active_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  completion_rate_pct: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  recent_activity: ActivityEvent[];
  project_summaries: Array<{
    id: string;
    name: string;
    total: number;
    completed: number;
    completion_rate: number;
  }>;
}

// Request & Response DTOs
export interface RegisterDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserSafe;
  token: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  is_archived?: boolean;
  color?: string;
}

export interface CreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  tags?: string[]; // tag names or IDs
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  due_date?: string | null;
  position?: number;
  tags?: string[];
}

export interface CreateCommentDto {
  content: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface UpdateProfileDto {
  name?: string;
  avatar_url?: string | null;
  current_password?: string;
  new_password?: string;
}

export interface AddProjectMemberDto {
  user_id?: string;
  email?: string;
  role?: ProjectMemberRole;
}

export interface UpdateProjectMemberDto {
  role: ProjectMemberRole;
}

export interface SearchQueryDto {
  q?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSubtaskDto {
  title: string;
  position?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  is_completed?: boolean | number;
  position?: number;
}

