import { GitHubService } from './github';
import { Scanner, ScanResult } from '@secretio/shared';
import { ScanRequest } from '../types/github';
import { DatabaseService } from './database';
import { jobQueue } from './jobQueue';

export interface ScanResponse {
  success: boolean;
  results: ScanResult[];
  stats: {
      files_scanned: number;           
      keys_found: number;              
      high_severity: number;           
      medium_severity: number;        
      low_severity: number;            
      total_files?: number;       
      duration_ms?: number; 
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
  private dbClient: DatabaseService;

  constructor(dbClient:DatabaseService,githubToken?: string) {
    this.githubService = new GitHubService(githubToken);
    this.scanner = new Scanner();
    this.dbClient = dbClient;
  }

  // Original synchronous scan method (keeping for backward compatibility)
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
        files_scanned:filesScanned,
        keys_found: allResults.length,
        high_severity: allResults.filter(r => r.severity === 'high').length,
        medium_severity: allResults.filter(r => r.severity === 'medium').length,
        low_severity: allResults.filter(r => r.severity === 'low').length
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

  // NEW: Real-time scan method for job queue processing
  async scanRepositoryWithRealTimeUpdates(jobId: string, request: ScanRequest): Promise<void> {
    const { owner, repo, branch = 'main' } = request;
    
    try {
      console.log(`🔍 Starting real-time repository scan: ${owner}/${repo}`);

      // Update job status to running
      if (jobQueue) {
        await jobQueue.updateJobStatus(jobId, this.dbClient,'running');
      }

      // Step 1: Get repository info and files
      const repository = await this.githubService.getRepository(owner, repo);
      const files = await this.githubService.getRepositoryTree(owner, repo, branch);
      
      const totalFiles = files.length;
      const allResults: ScanResult[] = [];
      let filesScanned = 0;

      // Step 2: Update initial progress
      if (jobQueue) {
        await jobQueue.updateJobProgress(jobId, {
          current: 0,
          total: totalFiles,
          currentFile: 'Starting scan...'
        },this.dbClient);
      }

      // Step 3: Process files in batches for real-time updates
      const BATCH_SIZE = 5;
      const batches = this.chunkArray(files, BATCH_SIZE);

      for (const batch of batches) {
        const batchResults: ScanResult[] = [];

        // Process each file in the batch
        for (const file of batch) {
          try {
            // Update progress for current file
            if (jobQueue) {
              await jobQueue.updateJobProgress(jobId, {
                current: filesScanned + 1,
                total: totalFiles,
                currentFile: file.path
              },this.dbClient);
            }

            const content = await this.githubService.getFileContent(file.download_url);
            const fileResults = this.scanner.scanContent(content, file.path);
            
            // Convert results to match database schema
            const dbFormattedResults = fileResults.map(result => ({
              ...result,
              file_path: result.file_path || result.file_path, // Handle both formats
              line_number: result.line_number || result.line_number, // Handle both formats
              masked_value: this.maskApiKey(result.match)
            }));

            batchResults.push(...dbFormattedResults);
            allResults.push(...dbFormattedResults);
            filesScanned++;

          } catch (error) {
            console.warn(`⚠️ Skipping ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
            filesScanned++;
          }
        }

        // Store intermediate results after each batch
        if (batchResults.length > 0) {
          try {
            await this.dbClient.storeIntermediateResults(jobId, batchResults);
            console.log(`📊 Stored ${batchResults.length} new results (total: ${allResults.length})`);
          } catch (error) {
            console.error(`❌ Failed to store intermediate results:`, error);
          }
        }

        // Small delay to prevent overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 4: Calculate final stats
      const stats = {
        files_scanned:filesScanned,
        keys_found: allResults.length,
        high_severity: allResults.filter(r => r.severity === 'high').length,
        medium_severity: allResults.filter(r => r.severity === 'medium').length,
        low_severity: allResults.filter(r => r.severity === 'low').length,
        repository: {
          owner,
          repo,
          branch: branch || repository.default_branch,
          totalFiles: files.length
        }
      };

      // Step 5: Set final job result
      if (jobQueue) {
        await jobQueue.setJobResult(jobId, {
          success: true,
          results: allResults,
          stats,
          repository: stats.repository
        }, this.dbClient);

        // Update job status to completed
        await jobQueue.updateJobStatus(jobId, this.dbClient,'completed');
      }

      console.log(`✅ Real-time scan completed: ${allResults.length} API keys found in ${filesScanned} files`);

    } catch (error) {
      console.error(`❌ Real-time scan failed for job ${jobId}:`, error);
      
      if (jobQueue) {
        await jobQueue.updateJobStatus(
          jobId, 
          this.dbClient,
          'failed', 
          error instanceof Error ? error.message : 'Unknown scan error'
        );
      }
      
      throw error;
    }
  }

  // Keep original method for multiple repositories
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
          stats: { files_scanned: 0, keys_found: 0, high_severity: 0, medium_severity: 0, low_severity: 0 },
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

  // Keep original rate limit method
  async getRateLimit(): Promise<any> {
    return this.githubService.getRateLimit();
  }
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) {
      return '*'.repeat(key.length);
    }
    
    const start = key.slice(0, 4);
    const end = key.slice(-4);
    const middle = '*'.repeat(Math.max(0, key.length - 8));
    
    return `${start}${middle}${end}`;
  }
}