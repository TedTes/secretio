export interface RepoSizeWarning {
    level: 'success' | 'info' | 'warning' | 'error';
    message: string;
    suggestion: string;
    estimatedRequests: number;
    canScan: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'very-high';
  }
  
  /**
   * Analyzes repository size and provides warnings about rate limiting risk
   * @param size Repository size in KB
   * @returns Warning object with recommendations
   */
  export function getRepoSizeWarning(size: number): RepoSizeWarning {
    // Estimate API requests needed (rough calculation)
    // GitHub tree API + file content requests
    const estimatedRequests = Math.ceil(size / 1000) + 10; // Base overhead
    
    if (size > 500000) { // > 500MB
      return {
        level: 'error',
        message: '🚨 Extremely Large Repository',
        suggestion: 'This repository is too large to scan safely. Consider scanning specific directories or smaller repositories first.',
        estimatedRequests,
        canScan: false,
        riskLevel: 'very-high'
      };
    } else if (size > 200000) { // > 200MB
      return {
        level: 'error',
        message: '❌ Very Large Repository',
        suggestion: 'High risk of hitting GitHub rate limits. Try scanning a smaller repository or wait for rate limits to reset.',
        estimatedRequests,
        canScan: false,
        riskLevel: 'very-high'
      };
    } else if (size > 100000) { // > 100MB
      return {
        level: 'warning',
        message: '⚠️ Large Repository',
        suggestion: 'May hit rate limits during scanning. Consider scanning during off-peak hours or with a higher-tier GitHub token.',
        estimatedRequests,
        canScan: estimatedRequests < 4000, // GitHub default is 5000/hour
        riskLevel: 'high'
      };
    } else if (size > 50000) { // > 50MB
      return {
        level: 'warning',
        message: '📊 Medium-Large Repository',
        suggestion: 'Should scan fine, but may take longer. Monitor for rate limit warnings.',
        estimatedRequests,
        canScan: true,
        riskLevel: 'medium'
      };
    } else if (size > 10000) { // > 10MB
      return {
        level: 'info',
        message: '📁 Medium Repository',
        suggestion: 'Good size for scanning. Low risk of rate limiting.',
        estimatedRequests,
        canScan: true,
        riskLevel: 'low'
      };
    } else { // <= 10MB
      return {
        level: 'success',
        message: '✅ Small Repository',
        suggestion: 'Perfect for scanning. Very low rate limit risk.',
        estimatedRequests,
        canScan: true,
        riskLevel: 'low'
      };
    }
  }
  
  /**
   * Format repository size for display
   * @param sizeInKB Size in kilobytes
   * @returns Formatted string (e.g., "1.2 MB", "500 KB")
   */
  export function formatRepoSize(sizeInKB: number): string {
    if (sizeInKB >= 1024 * 1024) {
      return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
    } else if (sizeInKB >= 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`;
    } else {
      return `${sizeInKB} KB`;
    }
  }
  
  /**
   * Get scanning recommendations based on current rate limit status
   * @param remaining Remaining API requests
   * @param repoSize Repository size in KB
   * @returns Scanning recommendation
   */
  export function getScanningRecommendation(remaining: number, repoSize: number): {
    canScan: boolean;
    message: string;
    suggestion: string;
  } {
    const warning = getRepoSizeWarning(repoSize);
    
    if (remaining < warning.estimatedRequests) {
      return {
        canScan: false,
        message: `⛔ Insufficient API quota (${remaining} remaining, ~${warning.estimatedRequests} needed)`,
        suggestion: 'Wait for rate limit reset or try a smaller repository.'
      };
    } else if (remaining < warning.estimatedRequests * 2) {
      return {
        canScan: true,
        message: `⚠️ Low API quota (${remaining} remaining, ~${warning.estimatedRequests} needed)`,
        suggestion: 'Scan will likely succeed but may use most of your remaining quota.'
      };
    } else {
      return {
        canScan: true,
        message: `✅ Sufficient API quota (${remaining} remaining, ~${warning.estimatedRequests} needed)`,
        suggestion: 'Safe to scan with plenty of quota remaining.'
      };
    }
  }
  
  /**
   * Smart repository filtering for users with low rate limits
   * @param repos Array of repositories
   * @param maxEstimatedRequests Maximum requests willing to spend
   * @returns Filtered and sorted repositories
   */
  export function filterReposBySize(repos: any[], maxEstimatedRequests: number = 100): any[] {
    return repos
      .map(repo => ({
        ...repo,
        warning: getRepoSizeWarning(repo.size || 0)
      }))
      .filter(repo => repo.warning.estimatedRequests <= maxEstimatedRequests)
      .sort((a, b) => {
        // Sort by: scannable first, then by size (smallest first)
        if (a.warning.canScan !== b.warning.canScan) {
          return a.warning.canScan ? -1 : 1;
        }
        return (a.size || 0) - (b.size || 0);
      });
  }