import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export function createSupabaseClientWithToken(token: string) {
  return createClient(
    supabaseUrl!,
    supabaseKey!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

// Database types
export interface DbUser {
  id: string;
  email?: string;
  github_username?: string;
  created_at: string;
  updated_at: string;
}

export interface DbScanJob {
  id: string;
  user_id?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  repository: string;
  branch: string;
  github_token?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  progress_current?: number;
  progress_total?: number;
  progress_file?: string;
}

export interface DbScanResult {
  id: string;
  job_id: string;
  service: string;
  file_path: string;
  line_number: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  masked_value: string;
  created_at: string;
}

export interface DbScanStats {
  id: string;
  job_id: string;
  files_scanned: number;
  keys_found: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  total_files: number;
  duration_ms: number;
  created_at: string;
}