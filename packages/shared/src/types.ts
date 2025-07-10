export interface ScanResult {
    service: string;
    file: string;
    line: number;
    match: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }
  
  export interface ApiKeyPattern {
    regex: RegExp;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }
  
  export interface ScanStats {
    filesScanned: number;
    keysFound: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  }