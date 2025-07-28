'use client'

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { ScanJob, ScanResult } from '../../lib/types';
import UserMenu from '../../components/auth/UserMenu';

export interface ScanStats {
  files_scanned: number;           
  keys_found: number;              
  high_severity: number;           
  medium_severity: number;        
  low_severity: number;            
  total_files?: number;       
  duration_ms?: number; 
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

  const [storedKeys, setStoredKeys] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastStoredKey, setLastStoredKey] = useState<{ keyName: string; service: string } | null>(null);

  // Real-time polling for job status
  const pollJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      console.log('🔄 Polling job status...', jobId);
      const jobData = await apiClient.getScanStatus(jobId);
      setJob(jobData);
      setLastUpdate(new Date());

      // Always try to fetch partial results and stats during scanning
      if (jobData.status === 'running' || jobData.status === 'completed') {
        try {
          const results = await apiClient.getScanResults(jobId);
          console.log('📊 Results data:', results);
          if (results) {
            setResultsData(results);
                      // Update stats in real-time based on actual data
            if (results.results && results?.results?.length > 0) {
              const realTimeStats = {
                ...results.stats,
                keys_found: results.results.length,
                high_severity: results.results.filter(r => r.severity === 'high').length,
                medium_severity: results.results.filter(r => r.severity === 'medium').length,
                low_severity: results.results.filter(r => r.severity === 'low').length,
                // Keep scan progress from job data if available
                files_scanned: jobData.progress?.current || results.stats.files_scanned || 0,
                total_files: jobData.progress?.total || results.stats.total_files || 0,
                duration_ms: results.stats.duration_ms || 0
              };
                // Update the results data with corrected stats
                setResultsData({
                  results: results.results,
                  stats: realTimeStats
                });
            }

          } else {
            console.warn('⚠️ No results returned from API');
            setError('No scan results available');
          }
        } catch (resultError) {
          // Don't show error during scanning, just log it
        if (jobData.status === 'completed') {
          console.error('❌ Failed to fetch results:', resultError);
          setError('Failed to load scan results');
        } else {
          console.warn('⚠️ Partial results not yet available');
        }
        }
        // Stop polling will be handled by useEffect cleanup
      } else if (jobData.status === 'failed') {
        console.log('❌ Job failed, stopping polling');
        setError(jobData.error || 'Scan failed');
        // Stop polling will be handled by useEffect cleanup
      }
    } catch (err) {
      console.error('❌ Polling error:', err);
      setError(err instanceof Error ? err.message : 'Failed to poll job status');
    }
  }, [jobId]); 

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
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Upgrade to vault plan required.');
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid request. Check key format.');
        } else {
          throw new Error(errorData.error || `Server error (${response.status})`);
        }
      }
  
      const data = await response.json();
      console.log('✅ Key stored successfully:', data);
      
      setStoredKeys(prev => new Set([...prev, keyName]));
      setLastStoredKey({ keyName, service: result.service });
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

   // Show success modal
   setShowSuccessModal(true);
      
    } catch (error) {
      console.error('❌ Failed to store key in vault:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to store key: ${errorMessage}`);
      if (errorMessage.includes('Authentication') || errorMessage.includes('expired')) {
        console.warn('Authentication issue - user may need to re-login');
      }
    } finally {
      setStoringKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };
  const loadScanData = async () => {
    if (!jobId) return;
    try {
      setLoading(true);
      setError(null);

      console.log('📡 Loading scan data for job:', jobId);
      
      // Get job status
      const jobData = await apiClient.getScanStatus(jobId);
      console.log('📊 Job data:', jobData);
      setJob(jobData);

      try {
        const results = await apiClient.getScanResults(jobId);
        if (results) {
          // Calculate real-time stats from actual data
          const calculatedStats = {
            keys_found: results.results?.length || 0,
            high_severity: results.results?.filter(r => r.severity === 'high').length || 0,
            medium_severity: results.results?.filter(r => r.severity === 'medium').length || 0,
            low_severity: results.results?.filter(r => r.severity === 'low').length || 0,
            files_scanned: jobData.progress?.current || results.stats?.files_scanned || 0,
            total_files: jobData.progress?.total || results.stats?.total_files || 0,
            duration_ms: results.stats?.duration_ms || 0
          };
  
          setResultsData({
            results: results.results || [],
            stats: calculatedStats
          });
        }
      } catch (resultError) {
        // Only show error if job is completed but no results
        if (jobData.status === 'completed') {
          console.error('❌ Failed to load results:', resultError);
          setError('Failed to load scan results');
        }
      }
    

    } catch (err) {
      console.error('❌ Failed to load scan data:', err);
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
            
            {/* REPLACE basic text with UserMenu */}
            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              {/* Replace this: <span className="text-gray-300">Welcome, {user?.email}</span> */}
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Header */}
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{job.request?.repo}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-300">
                <span>Branch: {job.request?.branch}</span>
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

      {/* Stats Summary with progress indicators */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">
        {resultsData?.stats?.keys_found || 0}
        {job?.status === 'running' && (
          <span className="text-sm text-yellow-400 ml-1 animate-pulse">+</span>
        )}
      </div>
      <div className="text-sm text-gray-300">Keys Found</div>
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-red-500 mb-2">
        {resultsData?.stats?.high_severity || 0}
        {job?.status === 'running' && (resultsData?.stats?.high_severity ?? 0)> 0 && (
          <span className="text-sm text-red-400 ml-1 animate-pulse">⚠</span>
        )}
      </div>
      <div className="text-sm text-gray-300">High Risk</div>
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">
        {job?.status === 'running' 
          ? `${job.progress?.current || 0}/${job.progress?.total || 0}`
          : resultsData?.stats?.files_scanned || 0
        }
      </div>
      <div className="text-sm text-gray-300">
        {job?.status === 'running' ? 'Files Scanning' : 'Files Scanned'}
      </div>
      {job?.status === 'running' && job.progress && (
        <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      )}
    </div>
  </div>
  
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">
        {job?.status === 'running' 
          ? '...' 
          : resultsData?.stats?.duration_ms 
            ? Math.round(resultsData.stats.duration_ms / 1000) 
            : 0
        }
        {job?.status !== 'running' && 's'}
      </div>
      <div className="text-sm text-gray-300">
        {job?.status === 'running' ? 'Scanning...' : 'Scan Time'}
      </div>
    </div>
  </div>
</div>
        
      </div>
      {resultsData && resultsData?.stats?.keys_found > 0 && (
  <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-lg p-6 mb-8">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">
          🚨 {resultsData.stats.keys_found} Exposed API Keys Found!
        </h3>
        <p className="text-gray-300 mb-4">
          Secure them in an encrypted vault to prevent unauthorized access.
        </p>
        <button
          onClick={() => router.push('/vault/upgrade')}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
        >
          🔐 Secure in Vault - $15/month
        </button>
      </div>
    </div>
  </div>
)}
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
   {/* success celebration modal */}
{showSuccessModal && lastStoredKey && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-slate-800 rounded-lg border border-gray-700 p-8 w-full max-w-lg mx-4">
      {/* Success Animation */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">🎉 Key Secured!</h3>
        <p className="text-gray-300">
          Your <span className="text-blue-400 font-mono">{lastStoredKey.service}</span> API key is now safely stored in your encrypted vault.
        </p>
      </div>

      {/* Success Details */}
      <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-green-400 mb-3">✅ What happened:</h4>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>• Key encrypted with AES-256 encryption</li>
          <li>• Stored as: <code className="bg-slate-700 px-1 rounded text-blue-400">{lastStoredKey.keyName}</code></li>
          <li>• Removed from your exposed credentials list</li>
          <li>• Ready for secure application access</li>
        </ul>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-blue-400 mb-3">🚀 Next steps:</h4>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>• Replace hardcoded keys in your source code</li>
          <li>• Use <code className="bg-slate-700 px-1 rounded">vault.getKey('{lastStoredKey.keyName}')</code></li>
          <li>• Set up your VAULT_TOKEN environment variable</li>
          <li>• Deploy your secure application</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={() => {
            // Copy integration snippet
            const snippet = `const ${lastStoredKey.service.replace(/_/g, '')}Key = await vault.getKey('${lastStoredKey.keyName}');`;
            navigator.clipboard.writeText(snippet);
            alert('Integration code copied to clipboard!');
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-white font-semibold transition-colors"
        >
          📋 Copy Integration Code
        </button>
        <button
          onClick={() => router.push('/vault')}
          className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg text-white font-semibold transition-colors"
        >
          🔐 View Vault
        </button>
        <button 
          onClick={() => {
            setShowSuccessModal(false);
            setLastStoredKey(null);
          }}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
)}

{/* Add completion celebration when all keys are stored */}
{resultsData && resultsData?.stats?.keys_found === 0 && storedKeys.size > 0 && (
  <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-6 mb-8">
    <div className="text-center">
      <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">🎊 Repository Secured!</h3>
      <p className="text-gray-300 mb-4">
        Congratulations! You've successfully secured <strong>{storedKeys.size}</strong> API keys. 
        Your repository is now free of exposed credentials.
      </p>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => router.push('/vault')}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
        >
          🔐 Manage Vault
        </button>
        <button
          onClick={() => router.push('/scan/new')}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
        >
          📡 Scan Another Repo
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors"
        >
          🏠 Dashboard
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}