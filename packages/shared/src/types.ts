

export interface ScanResult {
  success?:boolean;
  id?: string;                              // Database ID (optional for new results)
  service: string;                          // Service name (e.g., 'aws', 'stripe', 'openai')
  file_path: string;                        
  line_number: number;                   
  match: string;                           // Raw matched value
  masked_value?: string;                   // Masked version for display (added for security)
  severity: 'high' | 'medium' | 'low';    // Risk level
  description: string;                     // Human-readable description
  created_at?: string;                     // Timestamp (optional, added by DB)
}

// For compatibility
  export interface ApiKeyPattern {
    regex: RegExp;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }
  
// Real-time stats interface matching database
export interface ScanStats {
  files_scanned: number;           
  keys_found: number;              
  high_severity: number;           
  medium_severity: number; 
  low_severity: number; 
  total_files?: number;            // Added for progress tracking
  duration_ms?: number;            // Added for performance metrics
}