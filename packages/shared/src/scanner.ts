import { API_KEY_PATTERNS } from './patterns';
import { ScanResult } from './';

export class Scanner {
  scanContent(content: string, filePath: string): ScanResult[] {
    const results: ScanResult[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineNumber) => {
      // Skip comments and obvious false positives
      if (this.shouldSkipLine(line)) {
        return;
      }

      for (const [serviceName, pattern] of Object.entries(API_KEY_PATTERNS)) {
        const matches = line.match(pattern.regex);
        if (matches) {
          matches.forEach(match => {
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

    // Skip obvious false positives
    const falsePositives = [
      'example', 'placeholder', 'your_key_here', 'INSERT_KEY_HERE',
      'dummy', 'fake', 'test_key', 'sample', 'TODO', 'FIXME'
    ];

    return falsePositives.some(fp => 
      trimmed.toLowerCase().includes(fp.toLowerCase())
    );
  }

  private isValidApiKey(match: string, serviceName: string): boolean {
    // Additional validation rules per service
    switch (serviceName) {
      case 'jwt_token':
        // Basic JWT structure validation
        const parts = match.split('.');
        return parts.length === 3 && parts.every(part => part.length > 0);
      
      default:
        return true;
    }
  }
}