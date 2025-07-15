export interface User {
    id: string;
    email?: string;
    role?: string;
    github_username?: string;
    created_at?: string;
    updated_at?: string;
  }
  
  export interface AuthSession {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    user: User;
  }
  
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp?: string;
  }
  
  export interface AuthResponse {
    success: boolean;
    user?: User;
    session?: AuthSession;
    message?: string;
    error?: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    email: string;
    password: string;
    github_username?: string;
  }
  
  export interface ScanJob {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    repository: string;
    branch: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    progress?: {
      current: number;
      total: number;
      currentFile?: string;
    };
    error?: string;
  }
  
  export interface ScanResult {
    id: string;
    service: string;
    file_path: string;
    line_number: number;
    severity: 'high' | 'medium' | 'low';
    description: string;
    masked_value: string;
    created_at: string;
  }