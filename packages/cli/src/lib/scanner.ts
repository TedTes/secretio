import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { API_KEY_PATTERNS, FILE_PATTERNS } from './patterns';
import { ScanResult, ScanOptions, ScanStats } from '../types';

export class Scanner {
  private stats: ScanStats = {
    filesScanned: 0,
    keysFound: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0
  };

  async scanDirectory(options: ScanOptions): Promise<{ results: ScanResult[]; stats: ScanStats }> {
    const results: ScanResult[] = [];
    const scanPath = path.resolve(options.path);

    // Validate path exists
    try {
      await fs.access(scanPath);
    } catch (error) {
      throw new Error(`Path does not exist: ${scanPath}`);
    }

    // Get files to scan
    const files = await this.getFilesToScan(scanPath);
    
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileResults = this.scanFileContent(content, filePath);
        results.push(...fileResults);
        this.stats.filesScanned++;
      } catch (error) {
        // Skip files that can't be read (binary, permissions, etc.)
        continue;
      }
    }

    this.updateStats(results);
    return { results, stats: this.stats };
  }

  private async getFilesToScan(scanPath: string): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of FILE_PATTERNS.include) {
      try {
        const matches = await glob(pattern, {
          cwd: scanPath,
          absolute: true,
          ignore: FILE_PATTERNS.exclude,
          nodir: true
        });
        allFiles.push(...matches);
      } catch (error) {
        // Skip patterns that fail
        continue;
      }
    }

    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  private scanFileContent(content: string, filePath: string): ScanResult[] {
    const results: ScanResult[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineNumber) => {
      // Skip comments and common false positives
      if (this.shouldSkipLine(line)) {
        return;
      }

      for (const [serviceName, pattern] of Object.entries(API_KEY_PATTERNS)) {
        const matches = line.match(pattern.regex);
        if (matches) {
          matches.forEach(match => {
            // Additional validation to reduce false positives
            if (this.isValidApiKey(match, serviceName)) {
              results.push({
                service: serviceName,
                file: filePath,
                line: lineNumber + 1,
                match: match,
                severity: pattern.severity,
                description: pattern.description
              });
            }
          });
        }
      }
    });

    return results;
  }

  private shouldSkipLine(line: string): boolean {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return true;
    
    // Skip comments
    if (trimmed.startsWith('//') || 
        trimmed.startsWith('#') || 
        trimmed.startsWith('*') ||
        trimmed.startsWith('<!--')) {
      return true;
    }

    // Skip common false positive patterns
    const falsePositives = [
      'example',
      'placeholder',
      'your_key_here',
      'INSERT_KEY_HERE',
      'dummy',
      'fake',
      'test_key',
      'sample'
    ];

    return falsePositives.some(fp => 
      trimmed.toLowerCase().includes(fp.toLowerCase())
    );
  }

  private isValidApiKey(match: string, serviceName: string): boolean {
    // Additional validation rules per service
    switch (serviceName) {
      case 'aws_secret_key':
        // AWS secret keys should not be all the same character
        return !/^(.)\1+$/.test(match);
      
      case 'jwt_token':
        // Basic JWT structure validation
        const parts = match.split('.');
        return parts.length === 3 && parts.every(part => part.length > 0);
      
      default:
        return true;
    }
  }

  private updateStats(results: ScanResult[]): void {
    this.stats.keysFound = results.length;
    this.stats.highSeverity = results.filter(r => r.severity === 'high').length;
    this.stats.mediumSeverity = results.filter(r => r.severity === 'medium').length;
    this.stats.lowSeverity = results.filter(r => r.severity === 'low').length;
  }

  getStats(): ScanStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      filesScanned: 0,
      keysFound: 0,
      highSeverity: 0,
      mediumSeverity: 0,
      lowSeverity: 0
    };
  }
}