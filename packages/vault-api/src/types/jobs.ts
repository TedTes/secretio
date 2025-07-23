import { ScanResult } from '@secretio/shared';
import { ScanRepositoryRequest } from './api';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobProgress {
  current: number;
  total: number;
  currentFile?: string;
}

export interface BaseJob {
  id: string;
  type: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: JobProgress;
  error?: string;
}

export interface ScanJob extends BaseJob {
  type: 'scan';
  request: ScanRepositoryRequest;
  result?: {
    success: boolean;
    results: ScanResult[];
    stats: {
      files_scanned: number;
      keys_found: number;
      high_severity: number;
      medium_severity: number;
      low_severity: number;
    };
    repository: {
      owner: string;
      repo: string;
      branch: string;
      totalFiles: number;
    };
 
  };
  progress_current?:number;
  progress_total?:number;
  started_at?:Date;
}

export interface JobQueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}