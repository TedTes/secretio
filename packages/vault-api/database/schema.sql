-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan Jobs table
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  repository TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  github_token TEXT, -- Encrypted in production
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_file TEXT
);

-- Scan Results table
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  description TEXT NOT NULL,
  masked_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan Statistics table
CREATE TABLE IF NOT EXISTS scan_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  files_scanned INTEGER NOT NULL DEFAULT 0,
  keys_found INTEGER NOT NULL DEFAULT 0,
  high_severity INTEGER NOT NULL DEFAULT 0,
  medium_severity INTEGER NOT NULL DEFAULT 0,
  low_severity INTEGER NOT NULL DEFAULT 0,
  total_files INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_jobs_user_id ON scan_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_created_at ON scan_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_job_id ON scan_results(job_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_severity ON scan_results(severity);

-- RLS (Row Level Security) policies
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_stats ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON scan_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Users can only see results from their own jobs
CREATE POLICY "Users can view own results" ON scan_results
  FOR SELECT USING (
    job_id IN (SELECT id FROM scan_jobs WHERE user_id = auth.uid())
  );

-- Users can only see stats from their own jobs
CREATE POLICY "Users can view own stats" ON scan_stats
  FOR SELECT USING (
    job_id IN (SELECT id FROM scan_jobs WHERE user_id = auth.uid())
  );
