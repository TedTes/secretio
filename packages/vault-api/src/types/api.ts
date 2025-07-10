import { ScanResult } from '@secretio/shared';

// Request types
export interface ScanRepositoryRequest {
  owner: string;
  repo: string;
  branch?: string;
  github_token?: string;
}

export interface ScanMultipleRequest {
  repositories: {
    owner: string;
    repo: string;
    branch?: string;
  }[];
  github_token?: string;
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScanStats {
  filesScanned: number;
  keysFound: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
}

export interface ScanRepositoryResponse {
  success: boolean;
  results: ScanResult[];
  stats: ScanStats;
  repository: {
    owner: string;
    repo: string;
    branch: string;
    totalFiles: number;
  };
  metadata: {
    scanId: string;
    timestamp: string;
    duration: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: ValidationError[];
  timestamp: string;
}