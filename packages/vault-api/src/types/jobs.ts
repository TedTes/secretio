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
      filesScanned: number;
      keysFound: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
    };
    repository: {
      owner: string;
      repo: string;
      branch: string;
      totalFiles: number;
    };
  };
}

export interface JobQueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}