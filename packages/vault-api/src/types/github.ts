export interface GitHubFile {
    path: string;
    name: string;
    sha: string;
    size: number;
    url: string;
    download_url: string;
    type: 'blob' | 'tree';
  }
  
  export interface GitHubTree {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
  }
  
  export interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
  }
  
  export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
    private: boolean;
    default_branch: string;
    size: number;
  }
  
  export interface ScanRequest {
    owner: string;
    repo: string;
    branch?: string;
    github_token?: string;
  }
  
  export interface ScanResult {
    id?: string;                             // Optional until stored in DB
    service: string;
    file_path: string;                       // Updated field name  
    line_number: number;                     // Updated field name
    match: string;
    masked_value?: string;                   // Will be added when storing
    severity: 'high' | 'medium' | 'low';
    description: string;
    created_at?: string;                     // Will be added when storing
  }