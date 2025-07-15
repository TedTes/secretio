import {ApiResponse,AuthResponse,LoginRequest,RegisterRequest,User,ScanJob,ScanResult} from "./types"
class ApiClient {
    private baseURL: string;
    private accessToken: string | null = null;
  
    constructor() {
      this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Initialize token from localStorage if available
      if (typeof window !== 'undefined') {
        this.accessToken = localStorage.getItem('access_token');
      }
    }
  
    setToken(token: string | null) {
      this.accessToken = token;
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem('access_token', token);
        } else {
          localStorage.removeItem('access_token');
        }
      }
    }
  
    getToken(): string | null {
      return this.accessToken;
    }
  
    private async request<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
      const url = `${this.baseURL}${endpoint}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
  
      // Add authorization header if token exists
      if (this.accessToken) {
       ( headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`;
      }
  
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });
  
        let data: ApiResponse<T>;
        
        try {
          data = await response.json();
        } catch {
          // If JSON parsing fails, create a basic response
          data = {
            success: false,
            error: 'Invalid response format',
          };
        }
  
        // Handle different HTTP status codes
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          window.location.href = '/';
          throw new Error('Authentication required');
        }
  
        if (response.status === 403) {
          throw new Error('Insufficient permissions');
        }
  
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
  
        return data;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    }
  
    // Authentication endpoints
    async login(credentials: LoginRequest): Promise<AuthResponse> {
      const response = await this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (response.success && response.data?.session?.access_token) {
        this.setToken(response.data.session.access_token);
      }
      
      return response.data || response;
    }
  
    async register(userData: RegisterRequest): Promise<AuthResponse> {
      const response = await this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      if (response.success && response.data?.session?.access_token) {
        this.setToken(response.data.session.access_token);
      }
      
      return response.data || response;
    }
  
    async logout(): Promise<void> {
      try {
        await this.request('/api/auth/logout', {
          method: 'POST',
        });
      } finally {
        this.setToken(null);
      }
    }
  
    async refreshToken(): Promise<AuthResponse> {
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refresh_token') 
        : null;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
  
      const response = await this.request<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      
      if (response.success && response.data?.session?.access_token) {
        this.setToken(response.data.session.access_token);
        if (response.data.session.refresh_token) {
          localStorage.setItem('refresh_token', response.data.session.refresh_token);
        }
      }
      
      return response.data || response;
    }
  
    async getCurrentUser(): Promise<User | null> {
      try {
        const response = await this.request<User>('/api/auth/me');
        return response.success ? response.data || null : null;
      } catch {
        return null;
      }
    }
  
    async validateSession(): Promise<{ user: User; valid: boolean } | null> {
      try {
        const response = await this.request<{ user: User; valid: boolean }>('/api/auth/session');
        return response.success ? response.data || null : null;
      } catch {
        return null;
      }
    }
  
    // OAuth endpoints
    async getOAuthUrl(provider: 'google' | 'github'): Promise<{ url: string }> {
      const response = await this.request<{ url: string }>(`/api/auth/oauth/${provider}`, {
        method: 'POST',
        body: JSON.stringify({
          redirect_url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/callback`
        }),
      });
      
      if (!response.success || !response.data) {
        throw new Error(`Failed to get ${provider} OAuth URL`);
      }
      
      return response.data;
    }
  
    async handleOAuthCallback(provider: string, code: string, state?: string): Promise<AuthResponse> {
      const response = await this.request<AuthResponse>('/api/auth/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({ provider, code, state }),
      });
      
      if (response.success && response.data?.session?.access_token) {
        this.setToken(response.data.session.access_token);
        if (response.data.session.refresh_token) {
          localStorage.setItem('refresh_token', response.data.session.refresh_token);
        }
      }
      
      return response.data || response;
    }
  
    // Scan endpoints
    async startScan(owner: string, repo: string, branch?: string, githubToken?: string): Promise<{ jobId: string }> {
      const response = await this.request<{ jobId: string }>('/api/scan/async', {
        method: 'POST',
        body: JSON.stringify({
          owner,
          repo,
          branch,
          github_token: githubToken,
        }),
      });
      
      if (!response.success || !response.data) {
        throw new Error('Failed to start scan');
      }
      
      return response.data;
    }
  
    async getScanStatus(jobId: string): Promise<ScanJob> {
      const response = await this.request<ScanJob>(`/api/jobs/status/${jobId}`);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to get scan status');
      }
      
      return response.data;
    }
  
    async getScanResults(jobId: string): Promise<{ results: ScanResult[]; stats: any }> {
      const response = await this.request<{ results: ScanResult[]; stats: any }>(`/api/jobs/results/${jobId}`);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to get scan results');
      }
      
      return response.data;
    }
  
    // User endpoints
    async getUserJobs(): Promise<ScanJob[]> {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await this.request<{ jobs: ScanJob[] }>(`/api/users/${user.id}/jobs`);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to get user jobs');
      }
      
      return response.data.jobs;
    }
  
    async getUserStats(): Promise<unknown> {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await this.request(`/api/users/${user.id}/stats`);
      
      if (!response.success) {
        throw new Error('Failed to get user stats');
      }
      
      return response.data;
    }
  }
  
  // Export singleton instance
  export const apiClient = new ApiClient();
  export default apiClient;