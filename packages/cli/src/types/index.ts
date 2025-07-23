export interface ScanResult {
  id?: string;                             // Optional for CLI usage
  service: string;                         
  file_path: string;                       // Updated field name
  line_number: number;                     // Updated field name
  match: string;                          
  masked_value?: string;                   // Added for consistency
  severity: 'high' | 'medium' | 'low';    
  description: string;                     
  created_at?: string;                     // Added for consistency
}
  
  export interface ScanOptions {
    path: string;
    allRepos?: boolean;
    format?: 'table' | 'json';
    output?: string;
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