-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Add foreign key constraint to reference auth.users
ALTER TABLE users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Function to handle new Supabase users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    avatar_url,
    github_username
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.app_metadata->>'provider' = 'github' 
      THEN NEW.raw_user_meta_data->>'user_name'
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    github_username = COALESCE(EXCLUDED.github_username, users.github_username),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Allow the trigger to insert (system access)
CREATE POLICY "System can insert users" 
  ON users FOR INSERT 
  WITH CHECK (true);
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



-- github_connections table

-- Create user_github_connections table
CREATE TABLE IF NOT EXISTS user_github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type VARCHAR(20) DEFAULT 'bearer',
  scope TEXT,
  github_username VARCHAR(255) NOT NULL,
  github_user_id BIGINT NOT NULL,
  github_avatar_url TEXT,
  github_name TEXT,
  public_repos INTEGER DEFAULT 0,
  private_repos INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id), -- One GitHub connection per user
  UNIQUE(github_user_id) -- One user per GitHub account
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_github_connections_user_id ON user_github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_github_connections_github_user_id ON user_github_connections(github_user_id);
CREATE INDEX IF NOT EXISTS idx_user_github_connections_github_username ON user_github_connections(github_username);

-- Enable RLS
ALTER TABLE user_github_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY  "Users can view own GitHub connection" 
  ON user_github_connections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY  "Users can insert own GitHub connection" 
  ON user_github_connections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY  "Users can update own GitHub connection" 
  ON user_github_connections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY  "Users can delete own GitHub connection" 
  ON user_github_connections FOR DELETE 
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_github_connections_updated_at 
  BEFORE UPDATE ON user_github_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();