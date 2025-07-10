import fetch from 'node-fetch';
import { GitHubTree, GitHubRepository, GitHubFile } from '../types/github';

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
}