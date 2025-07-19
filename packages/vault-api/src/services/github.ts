import fetch from 'node-fetch';
import { GitHubTree, GitHubRepository, GitHubFile } from '../types/github';
import { supabase } from '../config/database';
import { SupabaseClient } from '@supabase/supabase-js';
export class GitHubService {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const response = await this.makeRequest(`/repos/${owner}/${repo}`);
    return response as GitHubRepository;
  }

  async getRepositoryTree(owner: string, repo: string, branch = 'main'): Promise<GitHubFile[]> {
    try {
      // Get recursive tree
      const tree = await this.makeRequest(
        `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      ) as GitHubTree;

      if (!tree.tree) {
        throw new Error('Repository tree not found');
      }

      // Filter for files only and scannable types
      return tree.tree
        .filter(item => item.type === 'blob') // Only files, not directories
        .filter(item => this.shouldScanFile(item.path))
        .filter(item => (item.size || 0) <= 1048576) // 1MB limit
        .slice(0, 1000) // Limit to 1000 files
        .map(item => ({
          path: item.path,
          name: item.path.split('/').pop() || '',
          sha: item.sha,
          size: item.size || 0,
          url: item.url,
          download_url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`,
          type: 'blob' as const
        }));

    } catch (error) {
      // Try 'master' branch if 'main' fails
      if (branch === 'main' && error instanceof Error && error.message.includes('404')) {
        return this.getRepositoryTree(owner, repo, 'master');
      }
      throw error;
    }
  }

  async getFileContent(downloadUrl: string): Promise<string> {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Secretio-Vault-API/1.0.0'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Use default error message
      }

      if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
          errorMessage = `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`;
        }
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  }

  private shouldScanFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase();
    
    // Include patterns
    const includePatterns = [
      /\.(js|ts|jsx|tsx|json|env|md|yml|yaml|toml|ini)$/,
      /\.(py|rb|php|go|java|cs|cpp|c|h)$/,
      /\.(sh|bash|zsh|fish|ps1|bat|cmd)$/,
      /^\.env/,
      /config$/,
      /secrets?$/
    ];

    // Exclude patterns
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.min\./,
      /\.bundle\./,
      /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz)$/,
      /package-lock\.json$/,
      /yarn\.lock$/
    ];

    // Check exclude patterns first
    if (excludePatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }

    // Check include patterns
    return includePatterns.some(pattern => pattern.test(fileName));
  }

  async getRateLimit(): Promise<any> {
    return this.makeRequest('/rate_limit');
  }



  async exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string; scope: string }> {
    const client_id = process.env.GITHUB_CLIENT_ID;
    const client_secret = process.env.GITHUB_CLIENT_SECRET;
    const url = 'https://github.com/login/oauth/access_token';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('No access token returned from GitHub');
    }
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  async getGitHubUser(access_token: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Secretio-Vault-API/1.0.0'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub user: ${response.status} ${response.statusText}`);
    }
  
    return await response.json();
  }
  async getUserRepositories(
    access_token: string,
    options: { page?: number; per_page?: number; type?: string; sort?: string }
  ): Promise<any[]> {
    const params = new URLSearchParams({
      page: String(options.page ?? 1),
      per_page: String(options.per_page ?? 30),
      type: options.type ?? 'all',
      sort: options.sort ?? 'updated',
    });
  
    const response = await fetch(`https://api.github.com/user/repos?${params.toString()}`, {
      headers: {
        'Authorization': `token ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Secretio-Vault-API/1.0.0'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
    }
  
    return await response.json();
  }

  async getRepositoryBranches(access_token: string, repoFullName: string): Promise<any[]> {
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
      headers: {
        'Authorization': `token ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Secretio-Vault-API/1.0.0'
      }
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
    }
  
    return await response.json();
  }



  async getUserGitHubConnection(userId: string,supabase:SupabaseClient): Promise<any> {
    const { data, error } = await supabase
      .from('user_github_connections')
      .select('*')
      .eq('user_id', userId)
      .single();
  
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }
  
    return data;
  }
  async validateToken(access_token: string): Promise<boolean> {
    // Simple check: try to fetch the authenticated user
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Secretio-Vault-API/1.0.0'
      }
    });
    return response.ok;
  }

  async removeUserGitHubToken(userId: string,supabase:SupabaseClient): Promise<void> {
    const { error } = await supabase
      .from('user_github_connections')
      .delete()
      .eq('user_id', userId);
  
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async storeUserGitHubToken(userId: string, tokenData: any,supabase: SupabaseClient): Promise<void> {
    const { error } = await supabase
      .from('user_github_connections')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        github_username: tokenData.github_username,
        github_user_id: tokenData.github_user_id,
        github_avatar_url: tokenData.github_avatar_url,
        github_name: tokenData.github_name,
        public_repos: tokenData.public_repos,
        private_repos: tokenData.private_repos,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
  
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}
