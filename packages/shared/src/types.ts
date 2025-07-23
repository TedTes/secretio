

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
  files_scanned: number;           // Updated field name
  keys_found: number;              // Updated field name  
  high_severity: number;           // Updated field name
  medium_severity: number;         // Updated field name
  low_severity: number;            // Updated field name
  total_files?: number;            // Added for progress tracking
  duration_ms?: number;            // Added for performance metrics
}