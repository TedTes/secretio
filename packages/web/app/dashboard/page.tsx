'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useApi, useUserJobs, useUserStats } from '../hooks/useApi';
import { apiClient } from '../lib/api';
import { ScanJob } from '../lib/types';

type UserStats = {
    totalScans: number;
    totalKeysFound: number;
    totalFilesScanned: number;
  };
export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
//   API hooks for user data
  const { data: jobs, loading: jobsLoading, execute: refetchJobs } = useUserJobs();
  const { data: stats, loading: statsLoading } = useUserStats() as { data?: UserStats, loading: boolean };

  useEffect(() => {
    if (isAuthenticated) {
      refetchJobs();
    }
  }, [isAuthenticated]);

//   Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

//   Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">Please log in to access your dashboard.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
          >
            Go Home
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
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-xl font-bold text-white">secretio</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.email}</span>
              <button
                onClick={() => window.location.href = '/settings'}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-300">
            Monitor your repository security and manage API keys
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Scans</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.totalScans || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Keys Found</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.totalKeysFound || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Files Scanned</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? '...' : stats?.totalFilesScanned || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

   {/* Action Cards */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
  {/* New Scan Card */}
  <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
    <h2 className="text-xl font-bold text-white mb-4">Start New Scan</h2>
    <p className="text-gray-300 mb-6">
      Scan your GitHub repositories for exposed API keys and credentials
    </p>
    <button
      onClick={() => router.push('/scan/new')}
      className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
    >
      Scan Repository
    </button>
  </div>

  {/* Rest of your existing vault upgrade card stays the same */}
  <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-6">
    <h2 className="text-xl font-bold text-white mb-4">🔐 Secure Vault</h2>
    <p className="text-gray-300 mb-4">
      Store and manage your API keys securely. Never hardcode credentials again.
    </p>
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-400">Starting at</span>
        <div className="text-2xl font-bold text-white">$15<span className="text-sm text-gray-400">/user/month</span></div>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-semibold transition-colors">
        Upgrade Now
      </button>
    </div>
  </div>
</div>

        {/* Recent Scans */}
        <div className="bg-slate-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Recent Scans</h2>
          </div>
          
          <div className="p-6">
            {jobsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-300 mt-4">Loading scans...</p>
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">No scans yet</h3>
                <p className="text-gray-300 mb-4">Start by scanning your first repository</p>
                <button
                  onClick={() => router.push('/scan/new')}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
                >
                  Scan Repository
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        job.status === 'completed' ? 'bg-green-500' :
                        job.status === 'failed' ? 'bg-red-500' :
                        job.status === 'running' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      <div>
                        <h3 className="font-medium text-white">{job.repository}</h3>
                        <p className="text-sm text-gray-300">
                          {new Date(job.createdAt).toLocaleDateString()} • {job.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/scan/${job.id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      View Results →
                    </button>
                  </div>
                ))}
                
                {jobs.length > 5 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => window.location.href = '/scan/history'}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View All Scans →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

}