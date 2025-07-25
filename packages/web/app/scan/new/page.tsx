'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import UserMenu from '../../components/auth/UserMenu';
import {GitHubUser, GitHubRepo, GitHubBranch} from "../../lib/types";

export default function NewScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [repoPage, setRepoPage] = useState(1);
  const [hasMoreRepos, setHasMoreRepos] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [repoTypeFilter, setRepoTypeFilter] = useState<'all' | 'public' | 'private'>('all');
  const [hasGitHubAccess, setHasGitHubAccess] = useState(false);


  useEffect(() => {

    const checkGitHubAccess = async () => {
        const connected = await apiClient.hasRepoAccess();
        setHasGitHubAccess(connected);
      };
      
      if (isAuthenticated) {
        checkGitHubAccess();
      }
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    // Check for callback status
    const githubStatus = searchParams.get('github');
    if (githubStatus === 'connected') {
      setSuccess('GitHub connected successfully! You can now scan your repositories.');
      setTimeout(() => setSuccess(null), 5000);
    } else if (githubStatus === 'error') {
      setError('Failed to connect GitHub. Please try again.');
    }

    if (hasGitHubAccess) {
      initializeGitHubData();
    }
  }, [isAuthenticated, router, hasGitHubAccess, searchParams]);

  const initializeGitHubData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get cached user data first
      let userData = apiClient.getCachedUser();
      
      if (!userData) {
        // If no cached data, fetch from GitHub
        userData = await apiClient.getUser();
      }
      
      setGithubUser(userData);
      await loadUserRepos(1,repoTypeFilter);
      
    } catch (err) {
      console.error('Failed to initialize GitHub data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load GitHub data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRepos = async (page = 1, type: 'all' | 'public' | 'private') => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedRepos = await apiClient.getRepositories(page, type);
      
     
      if (page === 1) {
        setRepos(fetchedRepos);
      } else {
        setRepos(prevRepos => [...prevRepos, ...fetchedRepos]);
      }
      setHasMoreRepos(fetchedRepos.length === 30);
      setRepoPage(page);
      
    } catch (err) {
      console.error('Failed to load repositories:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load repositories';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const loadMoreRepos = async () => {
    if (loading || !hasMoreRepos) return;
    await loadUserRepos(repoPage + 1, repoTypeFilter);
  };
  const loadRepoBranches = async (repo: GitHubRepo) => {
    try {
      setLoadingBranches(true);
      
      const branchData = await apiClient.getBranches(repo.full_name);
      setBranches(branchData);
      setSelectedBranch(repo.default_branch);
      
    } catch (err) {
      console.error('Failed to load branches:', err);
      // Fallback to default branch only
      setBranches([{ 
        name: repo.default_branch, 
        commit: { sha: '' }, 
        protected: false 
      }]);
      setSelectedBranch(repo.default_branch);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleGitHubConnect = () => {
    try {
      // Generate OAuth URL and redirect
      const oauthUrl = apiClient.getRepoAccessURL();
      window.location.href = oauthUrl;
    } catch (err) {
      setError('Failed to initiate GitHub connection. Please try again.');
    }
  };

  const handleGitHubDisconnect = async () => {
    try {
      await apiClient.disconnect();
      setGithubUser(null);
      setRepos([]);
      setSelectedRepo(null);
      setBranches([]);
      setSuccess('GitHub disconnected successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to disconnect GitHub');
    }
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setError(null);
    loadRepoBranches(repo);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (hasGitHubAccess) {
      // Debounce search
      setTimeout(() => loadUserRepos(1,repoTypeFilter), 300);
    }
  };

  const handleFilterChange = (filter: 'all' | 'public' | 'private') => {
    setRepoTypeFilter(filter);
    setRepoPage(1);
    setHasMoreRepos(true);
    if (hasGitHubAccess) {
       loadUserRepos(1,filter);
    }
  };

  const startScan = async () => {
    if (!selectedRepo || !selectedBranch) {
      setError('Please select a repository and branch');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      // Extract owner and repo name from full_name
      const [owner, repoName] = selectedRepo.full_name.split('/');

      // Start the scan using the vault-api with GitHub token
      const result = await apiClient.startScan(
        owner,
        repoName,
        selectedBranch
      );
      // Redirect to scan results page
      router.push(`/scan/${result.jobId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setScanning(false);
    }
  };

  const formatRepoSize = (sizeKB: number) => {
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${Math.round(sizeKB / 1024)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">Please log in to scan repositories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="h-6 border-l border-gray-600"></div>
              <h1 className="text-lg font-semibold text-white">New Security Scan</h1>
            </div>
            
            {/* REPLACE GitHub user info with UserMenu */}
            <div className="flex items-center space-x-4">
              {githubUser && (
                <div className="flex items-center space-x-2">
                  <img 
                    src={githubUser.avatar_url} 
                    alt={githubUser.name || githubUser.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-gray-300 hidden md:block">
                    {githubUser.name || githubUser.login}
                  </span>
                </div>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔍 Repository Security Scan
          </h1>
          <p className="text-xl text-gray-300">
            Scan your GitHub repositories for exposed API keys and secrets
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* GitHub Connection Required */}
        {!hasGitHubAccess && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-gray-800 to-slate-800 rounded-lg border border-gray-700 p-8 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">Connect Your GitHub Account</h2>
              <p className="text-gray-300 mb-6">
                To scan your repositories for security vulnerabilities, we need access to your GitHub repositories.
                This is separate from your Secretio account login.
              </p>
              
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Repository Access Only:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Read access to your repositories</li>
                  <li>• Repository metadata and file contents</li>
                  <li>• No ability to modify or delete anything</li>
                  <li>• Separate from your Secretio login</li>
                </ul>
              </div>

              <button
                onClick={handleGitHubConnect}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-8 py-4 rounded-lg text-white font-semibold transition-colors flex items-center justify-center mx-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub Repositories
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-400 mt-4">
                Secure OAuth • Repository access only • Revoke anytime in GitHub settings
              </p>
            </div>
          </div>
        )}

        {/* Repository Selection Interface */}
        {hasGitHubAccess && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Repository List */}
            <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Your Repositories</h2>
                  {githubUser && (
                    <span className="text-sm text-gray-300">
                      {githubUser.public_repos} total repos
                    </span>
                  )}
                </div>
                
                {/* Search and Filter */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={repoTypeFilter}
                    onChange={(e) => handleFilterChange(e.target.value as 'all' | 'public' | 'private')}
                    className="px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Repositories</option>
                    <option value="public">Public Only</option>
                    <option value="private">Private Only</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6">
                {loading && repos.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-300">Loading your repositories...</p>
                  </div>
                ) : repos.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-lg font-medium text-white mb-2">No repositories found</h3>
                    <p className="text-gray-300 mb-4">
                      {searchTerm ? 'No repositories match your search criteria.' : 'No repositories available for scanning.'}
                    </p>
                    {searchTerm && (
                      <button
                        onClick={() => handleSearch('')}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {repos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedRepo?.id === repo.id
                            ? 'border-blue-500 bg-blue-600/10'
                            : 'border-gray-600 hover:border-gray-500 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium text-white">{repo.name}</h3>
                              {repo.private && (
                                <span className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 rounded-full">
                                  Private
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-gray-300 mb-2 line-clamp-2">{repo.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              {repo.language && <span>📄 {repo.language}</span>}
                              <span>⭐ {repo.stargazers_count}</span>
                              <span>📦 {formatRepoSize(repo.size)}</span>
                              <span>🕒 {formatDate(repo.updated_at)}</span>
                            </div>
                          </div>
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMoreRepos && (
                      <div className="text-center pt-4">
                        <button
                          onClick={loadMoreRepos}
                          disabled={loading}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2 rounded-lg text-white transition-colors"
                        >
                          {loading ? 'Loading...' : 'Load More'}
                        </button>
                        <p className="text-sm text-gray-400 mt-2">
      Showing {repos.length} {repoTypeFilter === 'all' ? '' : repoTypeFilter} repositories
    </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scan Configuration */}
            <div className="bg-slate-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Scan Configuration</h2>
              </div>
              
              <div className="p-6">
                {!selectedRepo ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-300">Select a repository to configure your security scan</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Selected Repository Info */}
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">Selected Repository</h3>
                      <div className="bg-slate-700 rounded-lg p-3">
                        <p className="font-medium text-white">{selectedRepo.full_name}</p>
                        {selectedRepo.description && (
                          <p className="text-sm text-gray-300 mt-1">{selectedRepo.description}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                          <span>📦 {formatRepoSize(selectedRepo.size)}</span>
                          <span>🕒 {formatDate(selectedRepo.updated_at)}</span>
                          {selectedRepo.private && <span>🔒 Private</span>}
                        </div>
                      </div>
                    </div>

                    {/* Branch Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Branch to Scan
                      </label>
                      {loadingBranches ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-gray-300">Loading branches...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {branches.map((branch) => (
                            <option key={branch.name} value={branch.name}>
                              {branch.name} 
                              {branch.name === selectedRepo.default_branch && ' (default)'}
                              {branch.protected && ' 🔒'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Start Scan Button */}
                    <button
                      onClick={startScan}
                      disabled={scanning || !selectedRepo || !selectedBranch}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center justify-center"
                    >
                      {scanning ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Starting Security Scan...
                        </>
                      ) : (
                        <>
                          🔍 Start Security Scan
                        </>
                      )}
                    </button>

                    {/* Scan Info */}
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-400 mb-2">Security Scan Details:</h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Repository: {selectedRepo.full_name}</li>
                        <li>• Branch: {selectedBranch}</li>
                        <li>• Size: {formatRepoSize(selectedRepo.size)}</li>
                        <li>• Scan types: API keys, secrets, credentials</li>
                        <li>• Results will include vault storage options</li>
                      </ul>
                    </div>

                    {/* Vault Promotion */}
                    <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">🔐 After Scanning:</h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• View all exposed credentials</li>
                        <li>• One-click vault storage ($15/month)</li>
                        <li>• Replace hardcoded keys with secure API calls</li>
                        <li>• Automatic key rotation and monitoring</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}