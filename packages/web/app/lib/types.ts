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
  
  export interface ApiResponse<T = object> {
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
    match:string;
  }

  export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    description?: string;
    updated_at: string;
    language?: string;
    stargazers_count: number;
    size: number;
    html_url: string;
  }
  
  export interface GitHubUser {
    login: string;
    name: string;
    avatar_url: string;
    public_repos: number;
    email?: string;
  }
  export interface GitHubBranch {
    name: string;
    commit: {
      sha: string;
    };
    protected: boolean;
  }
  export interface GitHubConnectionStatus {
    connected?: boolean;
    user?: GitHubUser;
    message?: string;
    success?:string;
    error?:object | string;
  }