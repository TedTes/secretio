'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { ScanJob, ScanResult } from '../../lib/types';

interface ScanStats {
  files_scanned: number;
  keys_found: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  total_files: number;
  duration_ms: number;
}

interface ScanResultsData {
  results: ScanResult[];
  stats: ScanStats;
}

export default function ScanResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<ScanJob | null>(null);
  const [resultsData, setResultsData] = useState<ScanResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [storingKeys, setStoringKeys] = useState<Set<number>>(new Set());

  // Real-time polling for job status
  const pollJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      console.log('🔄 Polling job status...', jobId);
      const jobData = await apiClient.getScanStatus(jobId);
      setJob(jobData);
      setLastUpdate(new Date());

      // If job completed or failed, get final results and stop polling
      if (jobData.status === 'completed') {
        console.log('✅ Job completed, fetching results...');
        try {
          const results = await apiClient.getScanResults(jobId);
          console.log('📊 Results data:', results);
          if (results) {
            setResultsData(results);
          } else {
            console.warn('⚠️ No results returned from API');
            setError('No scan results available');
          }
        } catch (resultError) {
          console.error('❌ Failed to fetch results:', resultError);
          setError('Failed to load scan results');
        }
        // Stop polling will be handled by useEffect cleanup
      } else if (jobData.status === 'failed') {
        console.log('❌ Job failed, stopping polling');
        // Stop polling will be handled by useEffect cleanup
      }
    } catch (err) {
      console.error('❌ Polling error:', err);
      setError(err instanceof Error ? err.message : 'Failed to poll job status');
    }
  }, [jobId]); // Remove pollingInterval from dependencies

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    loadScanData();
    
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, isAuthenticated]);

  // Setup real-time polling
  useEffect(() => {
    if (job && (job.status === 'pending' || job.status === 'running')) {
      console.log('🚀 Starting real-time polling...');
      const interval = setInterval(pollJobStatus, 2000); // Poll every 2 seconds
      setPollingInterval(interval);

      return () => {
        console.log('🛑 Cleaning up polling interval');
        clearInterval(interval);
        setPollingInterval(null);
      };
    } else {
      // Clear polling if job is not running
      if (pollingInterval) {
        console.log('🛑 Stopping polling - job not running');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [job?.status]); // Only depend on job status, not pollJobStatus

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleStoreInVault = async (result: ScanResult, index: number) => {
    try {
      setStoringKeys(prev => new Set([...prev, index]));
      
      // Generate a user-friendly key name
      const keyName = `${result.service}_${Date.now()}`;
      
      // Call vault API to store the key
      const response = await fetch('/api/vault/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          keyName,
          service: result.service,
          value: result.match, // The actual API key value
          environment: 'production'
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to store key in vault');
      }
  
      const data = await response.json();
      
      // Remove the result from the list (optimistic update)
      if (resultsData) {
        const newResults = resultsData.results.filter((_, i) => i !== index);
        setResultsData({
          ...resultsData,
          results: newResults,
          stats: {
            ...resultsData.stats,
            keys_found: newResults.length
          }
        });
      }
  
      // Show success message
      alert(`✅ API key stored securely in vault as "${keyName}"`);
      
    } catch (error) {
      console.error('Failed to store key:', error);
      alert('❌ Failed to store key in vault. Please try again.');
    } finally {
      setStoringKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };
  const loadScanData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Loading scan data for job:', jobId);
      
      // Get job status
      const jobData = await apiClient.getScanStatus(jobId);
      console.log('📊 Job data:', jobData);
      setJob(jobData);

      // If job is completed, get results immediately
      if (jobData.status === 'completed') {
        console.log('✅ Job already completed, fetching results...');
        try {
          const results = await apiClient.getScanResults(jobId);
          console.log('📊 Initial results data:', results);
          if (results) {
            setResultsData(results);
          } else {
            console.warn('⚠️ No initial results returned from API');
            setError('No scan results available');
          }
        } catch (resultError) {
          console.error('❌ Failed to fetch initial results:', resultError);
          setError('Failed to load scan results');
        }
      }

    } catch (err) {
      console.error('❌ Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scan data');
    } finally {
      setLoading(false);
    }
  };



  const handleIgnoreResult = async (result: ScanResult, index: number) => {
    try {
      // TODO: Implement ignore functionality
      console.log('🙈 Ignoring result:', result);
      // Optimistically update UI
      if (resultsData) {
        const newResults = resultsData.results.filter((_, i) => i !== index);
        setResultsData({
          ...resultsData,
          results: newResults,
          stats: {
            ...resultsData.stats,
            keys_found: newResults.length
          }
        });
      }
    } catch (err) {
      console.error('❌ Ignore error:', err);
      alert('Failed to ignore result');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'running': return 'text-yellow-500 bg-yellow-500/10';
      case 'pending': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getProgressPercentage = () => {
    if (!job?.progress || job.progress.total === 0) return 0;
    return Math.round((job.progress.current / job.progress.total) * 100);
  };

  if (loading && !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Scan Not Found</h1>
          <p className="text-gray-300 mb-6">{error || 'This scan does not exist or you do not have access to it.'}</p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors block mx-auto"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors block mx-auto"
            >
              Retry
            </button>
          </div>
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
              <h1 className="text-lg font-semibold text-white">Scan Results</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <span className="text-gray-300">Welcome, {user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Header */}
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{job.repository}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-300">
                <span>Branch: {job.branch}</span>
                <span>•</span>
                <span>Scanned: {new Date(job.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                  {job.status.toUpperCase()}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                disabled={job.status !== 'completed'}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white text-sm transition-colors"
              >
                Export PDF
              </button>
              <button 
                disabled={job.status !== 'completed'}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white text-sm transition-colors"
              >
                Share Scan
              </button>
            </div>
          </div>
        </div>

        {/* Job Status */}
        {(job.status === 'pending' || job.status === 'running') && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-3"></div>
                <div>
                  <h3 className="text-yellow-500 font-medium">
                    {job.status === 'pending' ? 'Scan Queued' : 'Scan in Progress'}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {job.progress 
                      ? `${job.progress.current}/${job.progress.total} files scanned`
                      : job.status === 'pending' 
                        ? 'Waiting for scanner to become available...'
                        : 'Starting scan...'
                    }
                  </p>
                  {job.progress?.currentFile && (
                    <p className="text-gray-400 text-xs mt-1">
                      Current: {job.progress.currentFile}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-yellow-500 font-bold text-lg">
                {getProgressPercentage()}%
              </div>
            </div>
            
            {/* Progress Bar */}
            {job.progress && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {job.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-red-500 font-medium mb-2">Scan Failed</h3>
                <p className="text-gray-300 text-sm mb-4">
                  {job.error || 'An unknown error occurred during scanning'}
                </p>
                
                {/* GitHub Rate Limit Specific Handling */}
                {job.error && job.error.includes('rate limit') && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                    <h4 className="text-yellow-500 font-medium mb-2">🕐 GitHub Rate Limit Hit</h4>
                    <p className="text-gray-300 text-sm mb-3">
                      GitHub limits API requests to prevent abuse. Your scan will automatically resume when the limit resets.
                    </p>
                    
                    {/* Extract reset time from error message */}
                    {(() => {
                      const resetMatch = job.error?.match(/Resets at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
                      if (resetMatch) {
                        const resetTime = new Date(resetMatch[1]);
                        const now = new Date();
                        const minutesLeft = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60));
                        return (
                          <div className="text-sm text-gray-300">
                            <p>Rate limit resets in <strong className="text-white">{minutesLeft} minutes</strong></p>
                            <p className="text-xs text-gray-400 mt-1">
                              Reset time: {resetTime.toLocaleTimeString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white text-sm transition-colors"
                  >
                    Retry Scan
                  </button>
                  
                  {job.error && job.error.includes('rate limit') && (
                    <button 
                      onClick={() => router.push('/scan/new')}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white text-sm transition-colors"
                    >
                      Try Smaller Repo
                    </button>
                  )}
                  
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-white text-sm transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Content */}
        {job.status === 'completed' && resultsData && (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">{resultsData?.stats?.keys_found || 0}</div>
      <div className="text-sm text-gray-300">Keys Found</div>
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-red-500 mb-2">{resultsData?.stats?.high_severity || 0}</div>
      <div className="text-sm text-gray-300">High Risk</div>
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">{resultsData?.stats?.files_scanned || 0}</div>
      <div className="text-sm text-gray-300">Files Scanned</div>
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">{resultsData?.stats?.duration_ms ? Math.round(resultsData.stats.duration_ms / 1000) : 0}s</div>
      <div className="text-sm text-gray-300">Scan Time</div>
    </div>
  </div>
</div>

            {/* Vault Conversion CTA */}
            {resultsData?.stats?.keys_found > 0 && (
  <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-lg p-6 mb-8">
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            🚨 {resultsData?.stats?.keys_found || 0} Exposed API Keys Found!
          </h3>
          <p className="text-gray-300 mb-4">
            Your credentials are publicly accessible and could be exploited by attackers. 
            Secure them in an encrypted vault to prevent unauthorized access.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowVaultModal(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
            >
              🔐 Secure in Vault - $15/month
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Results Table */}
            <div className="bg-slate-800 rounded-lg border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Security Findings</h2>
              </div>
              
             {/* results table condition and content */}
            <div className="overflow-x-auto">
            {!resultsData?.results || resultsData.results.length === 0 ? (
            <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
            {!resultsData ? 'Loading Results...' : 'No Issues Found!'}
            </h3>
            <p className="text-gray-300">
            {!resultsData 
            ? 'Please wait while we process your scan results...'
            : 'Your repository appears to be free of exposed API keys.'
            }
            </p>
            </div>
            ) : (
            <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-slate-700">
            <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            Severity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            Service
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            File Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            Actions
            </th>
            </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-gray-700">
            {resultsData.results.map((result, index) => (
            <tr key={index} className="hover:bg-slate-700 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(result.severity)}`}>
              {result.severity.toUpperCase()}
            </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-white">{result.service}</div>
            <div className="text-sm text-gray-300">{result.description}</div>
            </td>
            <td className="px-6 py-4">
            <div className="text-sm text-white">{result.file_path}</div>
            <div className="text-sm text-gray-300">Line {result.line_number}</div>
            </td>
            <td className="px-6 py-4">
            <code className="text-sm bg-slate-700 px-2 py-1 rounded text-gray-300">
              {result.masked_value}
            </code>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
              <button 
                onClick={() => handleStoreInVault(result, index)}
                disabled={storingKeys.has(index)}
                className={`px-3 py-1 rounded text-white text-xs transition-colors ${
                  storingKeys.has(index)
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {storingKeys.has(index) ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white inline-block mr-1"></div>
                    Storing...
                  </>
                ) : (
                  '🔐 Store'
                )}
              </button>
              <button 
                onClick={() => handleIgnoreResult(result, index)}
                className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-white text-xs transition-colors"
              >
                Ignore
              </button>
              </td>
            </tr>
            ))}
            </tbody>
            </table>
            )}
            </div>
            </div>
          </>
        )}
      </div>

      {/* Vault Upgrade Modal */}
      {showVaultModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-slate-800 rounded-lg border border-gray-700 p-8 w-full max-w-lg mx-4">
      <h3 className="text-2xl font-bold text-white mb-4">🔐 Secure Your API Keys</h3>
      <p className="text-gray-300 mb-6">
        Store your {resultsData?.stats?.keys_found || 0} exposed API keys in an encrypted vault. 
        Never worry about hardcoded credentials again.
      </p>
      
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-white mb-2">What you get:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• AES-256 encrypted key storage</li>
          <li>• Environment-based access controls</li>
          <li>• Automatic key rotation</li>
          <li>• Team collaboration features</li>
          <li>• Audit logs and compliance reporting</li>
        </ul>
      </div>
      
      <div className="flex space-x-3">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors">
          Start Free Trial
        </button>
        <button 
          onClick={() => setShowVaultModal(false)}
          className="flex-1 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors"
        >
          Maybe Later
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}