import { GitHubService } from './github';
import { Scanner, ScanResult } from '@secretio/shared';
import { ScanRequest } from '../types/github';

export interface ScanResponse {
  success: boolean;
  results: ScanResult[];
  stats: {
    filesScanned: number;
    keysFound: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
  repository: {
    owner: string;
    repo: string;
    branch: string;
    totalFiles: number;
  };
}

export class ScanService {
  private githubService: GitHubService;
  private scanner: Scanner;

  constructor(githubToken?: string) {
    this.githubService = new GitHubService(githubToken);
    this.scanner = new Scanner();
  }

  async scanRepository(request: ScanRequest): Promise<ScanResponse> {
    const { owner, repo, branch = 'main' } = request;

    try {
      // Step 1: Get repository info
      const repository = await this.githubService.getRepository(owner, repo);
      
      // Step 2: Get scannable files
      const files = await this.githubService.getRepositoryTree(owner, repo, branch);
      
      // Step 3: Scan files for API keys
      const allResults: ScanResult[] = [];
      let filesScanned = 0;
      
      for (const file of files) {
        try {
          const content = await this.githubService.getFileContent(file.download_url);
          const fileResults = this.scanner.scanContent(content, file.path);
          allResults.push(...fileResults);
          filesScanned++;
        } catch (error) {
          // Skip files that can't be read (binary, too large, etc.)
          console.warn(`Skipping ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }

      // Step 4: Calculate stats
      const stats = {
        filesScanned,
        keysFound: allResults.length,
        highSeverity: allResults.filter(r => r.severity === 'high').length,
        mediumSeverity: allResults.filter(r => r.severity === 'medium').length,
        lowSeverity: allResults.filter(r => r.severity === 'low').length
      };

      // Step 5: Return complete response
      return {
        success: true,
        results: allResults,
        stats,
        repository: {
          owner,
          repo,
          branch: branch || repository.default_branch,
          totalFiles: files.length
        }
      };

    } catch (error) {
      throw new Error(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async scanMultipleRepositories(repositories: ScanRequest[]): Promise<ScanResponse[]> {
    const results: ScanResponse[] = [];
    
    for (const request of repositories) {
      try {
        const result = await this.scanRepository(request);
        results.push(result);
      } catch (error) {
        // Add failed scan to results
        results.push({
          success: false,
          results: [],
          stats: { filesScanned: 0, keysFound: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
          repository: {
            owner: request.owner,
            repo: request.repo,
            branch: request.branch || 'main',
            totalFiles: 0
          }
        });
      }
    }
    
    return results;
  }

  async getRateLimit(): Promise<any> {
    return this.githubService.getRateLimit();
  }
}