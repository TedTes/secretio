'use client'

import { useEffect } from 'react'; // Remove useMemo import
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useUserJobs, useUserStats } from '../hooks/useApi';
import UserMenu from '../components/auth/UserMenu';
import {ScanJob} from "../lib/types";
type UserStats = {
  totalScans: number;
  totalKeysFound: number;
  totalFilesScanned: number;
};

export default function Dashboard() {
  const { isAuthenticated, isLoading,isLoggingOut } = useAuth();
  const router = useRouter();
  
  // API hooks for user data
  const { data: jobs, loading: jobsLoading, execute: refetchJobs } = useUserJobs();
  const { data: stats, loading: statsLoading } = useUserStats() as { data?: UserStats, loading: boolean };

  const getRiskLevel = (keysFound: number) => {
    if (keysFound === 0) return 'safe';
    if (keysFound >= 5) return 'high';
    if (keysFound >= 2) return 'medium';
    return 'low';
  };
  
  const getRiskBadgeStyles = (riskLevel: string) => {
    const styles = {
      high: 'bg-red-600 text-white border-red-500',
      medium: 'bg-yellow-600 text-white border-yellow-500',
      low: 'bg-orange-600 text-white border-orange-500',
      safe: 'bg-green-600 text-white border-green-500',
      default: 'bg-gray-600 text-white border-gray-500'
    };
    return styles[riskLevel as keyof typeof styles] || styles.default;
  };
  
  const getStatusDotColor = (status: string, keysFound: number = 0) => {
    if (status === 'completed') {
      const riskLevel = getRiskLevel(keysFound);
      const riskColors = {
        high: 'bg-red-500',
        medium: 'bg-yellow-500', 
        low: 'bg-orange-500',
        safe: 'bg-green-500'
      };
      return riskColors[riskLevel as keyof typeof riskColors] || 'bg-green-500';
    }
    
    const statusColors = {
      failed: 'bg-red-500',
      running: 'bg-yellow-500',
      pending: 'bg-gray-500',
      default: 'bg-gray-500'
    };
    return statusColors[status as keyof typeof statusColors] || statusColors.default;
  };

  
  useEffect(() => {
    if (isAuthenticated) {
      refetchJobs();
    }
  }, [isAuthenticated]); // Remove refetchJobs from dependencies


  const hasJobs = jobs && jobs.length > 0;
  const lastScanDate = hasJobs ? new Date(jobs[0].createdAt).toLocaleDateString() : 'Never';
  const recentJobs = hasJobs ? jobs.slice(0, 5) : [];
  const hasMoreJobs = jobs && jobs.length > 5;

  // Loading state
  if (isLoading || isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">  {isLoggingOut ? 'Signing out...' : 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated  && !isLoggingOut) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Access Required</h1>
          <p className="text-gray-300 mb-6">Please sign in to access your security dashboard.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
          >
            Sign In
          </button>
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
            {/* Logo section */}
            <button onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">secretio</span>
            </button>
            
            {/* Navigation links */}
            <div className="flex items-center space-x-6">

          <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
      

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-300">Total Scans</p>
        <p className="text-lg font-bold text-white">
          {statsLoading ? '...' : stats?.totalScans || 0}
        </p>
      </div>
    </div>
  </div>

  <div className="bg-slate-800 rounded-lg border border-gray-700 p-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-300">Keys Found</p>
        <p className="text-lg font-bold text-white">
          {statsLoading ? '...' : stats?.totalKeysFound || 0}
        </p>
      </div>
    </div>
  </div>

  <div className="bg-slate-800 rounded-lg border border-gray-700 p-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-300">Files Scanned</p>
        <p className="text-lg font-bold text-white">
          {statsLoading ? '...' : stats?.totalFilesScanned || 0}
        </p>
      </div>
    </div>
  </div>

  <div className="bg-slate-800 rounded-lg border border-gray-700 p-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-6 h-6 bg-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-300">Security Score</p>
        <p className="text-lg font-bold text-white">
          {statsLoading ? '...' : (() => {
            const keysFound = stats?.totalKeysFound || 0;
            const filesScanned = stats?.totalFilesScanned || 0;
            if (filesScanned === 0) return 'N/A';
            const score = Math.max(0, Math.round(100 - (keysFound / filesScanned) * 100));
            return `${score}%`;
          })()}
        </p>
      </div>
    </div>
  </div>
</div>

        {/* Quick Actions Bar */}
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* GitHub Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">GitHub Connected</span>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
              </div>
              
              {/* Vault Status */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-300">Vault Free Plan</span>
                </div>
                
                <button
  onClick={() => router.push('/vault/upgrade')}
  className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-2 py-1 rounded text-white font-medium transition-all"
>
  Upgrade $15/mo
</button>
              </div>
              
              {/* Last Scan */}
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Last scan: {lastScanDate}</span>
              </div>
            </div>
            
            {/* Quick Actions */}
{/* Quick Actions */}
<div className="flex items-center space-x-3">
  <button
    onClick={() => router.push('/scan/new')}
    className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 25 24" style={{marginLeft:"-4px"}}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
    <span className="hidden sm:inline" style={{marginLeft:0}}>New Scan</span>
  </button>
  
  
  <div className="h-4 border-l border-gray-600 hidden md:block"></div>
  
  <button
    onClick={() => router.push('/vault')}
    className="text-gray-400 hover:text-white text-sm transition-colors items-center space-x-1 hidden lg:flex"
  >
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
    </svg>
    <span>Open Vault</span>
  </button>
</div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-slate-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent Scans</h2>
              {hasMoreJobs && (
                <button
                  onClick={() => router.push('/scan/history')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  View All ({jobs?.length})
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {jobsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-300 mt-4">Loading scans...</p>
              </div>
            ) : !hasJobs ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Start Scanning?</h3>
                <p className="text-gray-300 mb-6">Discover exposed API keys in your repositories</p>
                <button
                  onClick={() => router.push('/scan/new')}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
                >
                  Scan Your First Repository
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job: ScanJob) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-650 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusDotColor(job.status, job.keysFound)}`}></div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-white">{job.request.repo}</h3>
                          
                          {job.status === 'completed' && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                              getRiskBadgeStyles(getRiskLevel(job.keysFound || 0))
                            }`}>
                              {job.keysFound > 0 ? (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {job.keysFound} key{job.keysFound !== 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Clean
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                          <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="capitalize">{job.status}</span>
                          {job.status === 'completed' && job.filesScanned && (
                            <>
                              <span>•</span>
                              <span>{job.filesScanned.toLocaleString()} files</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {job.status === 'completed' && job.keysFound > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/scan/${job.id}#secure`);
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white transition-colors"
                          title="Secure found keys in vault"
                        >
                          Secure Keys
                        </button>
                      )}
                      
                      <button
                        onClick={() => router.push(`/scan/${job.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors flex items-center space-x-1"
                      >
                        <span>View</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}