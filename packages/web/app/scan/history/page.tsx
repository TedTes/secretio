'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
import { ScanJob } from '../../lib/types';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast'
import UserMenu from '../../components/auth/UserMenu'; 
export default function ScanHistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'repository'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'running'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deletingScans, setDeletingScans] = useState(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/');
      return;
    }

    if (isAuthenticated) {
      loadScanHistory();
    }
  }, [isAuthenticated, isLoading, router]);

  const loadScanHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userJobs = await apiClient.getUserJobs();
      setJobs(userJobs);
      
    } catch (err) {
      console.error('Failed to load scan history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'running': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'pending': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const filteredAndSortedJobs = () => {
    let filtered = jobs;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'repository':
          return a.repository.localeCompare(b.repository);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const paginatedJobs = () => {
    const filtered = filteredAndSortedJobs();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredAndSortedJobs().length / itemsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewResults = (jobId: string) => {
    router.push(`/scan/${jobId}`);
  };

  const handleDeleteScan = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this scan? This action cannot be undone.')) {
      return;
    }

    try {
       setDeletingScans(prev => new Set(prev).add(jobId));
     
      console.log('Deleting scan:', jobId);
      const response = await apiClient.deleteScanResult(jobId);
   
  
      if (!response.success) {
        const errorData = await response.error;
        throw new Error(errorData|| 'Failed to delete scan');
      }
  
      // Remove from local state for now
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      showSuccess('Scan deleted successfully');
  
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete scan. Please try again.');
     
    } finally {
      setDeletingScans(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Show loading state during auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">Please log in to view your scan history.</p>
          <button 
            onClick={() => router.push('/')}
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

{toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => hideToast(toast.id)}
          position="top-right"
          duration={5000}
        />
      ))}
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
              <h1 className="text-lg font-semibold text-white">Scan History</h1>
            </div>
            
            {/* REPLACE basic text with UserMenu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/scan/new')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              >
                New Scan
              </button>
              {/* Replace this: <span className="text-gray-300">Welcome, {user?.email}</span> */}
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Scan History</h1>
          <p className="text-gray-300">View and manage all your repository security scans</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-slate-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="repository">Repository</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              {filteredAndSortedJobs().length} scan{filteredAndSortedJobs().length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Scan List */}
        <div className="bg-slate-800 rounded-lg border border-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading scan history...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Failed to Load</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={loadScanHistory}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredAndSortedJobs().length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">No Scans Found</h3>
              <p className="text-gray-300 mb-4">
                {filterStatus === 'all' 
                  ? "You haven't run any scans yet. Start by scanning your first repository!"
                  : `No scans found with status "${filterStatus}". Try changing the filter.`
                }
              </p>
              <button
                onClick={() => router.push('/scan/new')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              >
                Start Your First Scan
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 font-medium text-gray-300 text-sm">
                  <div>Repository</div>
                  <div>Status</div>
                  <div>Date</div>
                  <div>Branch</div>
                  <div>Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-700">
                {paginatedJobs().map((job) => (
                  <div key={job.id} className="px-6 py-4 hover:bg-slate-700 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      {/* Repository */}
                      <div>
                        <h3 className="font-medium text-white">{job.repository}</h3>
                        <p className="text-sm text-gray-400">ID: {job.id.slice(0, 8)}...</p>
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          <span className="ml-1 capitalize">{job.status}</span>
                        </span>
                      </div>

                      {/* Date */}
                      <div>
                        <div className="text-sm text-white">{formatDate(job.createdAt)}</div>
                        {job.completedAt && (
                          <div className="text-xs text-gray-400">
                            Completed: {formatDate(job.completedAt)}
                          </div>
                        )}
                      </div>

                      {/* Branch */}
                      <div>
                        <span className="text-sm text-gray-300">{job.branch}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewResults(job.id)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-xs transition-colors"
                        >
                          View Results
                        </button>
                        <button
  onClick={() => handleDeleteScan(job.id)}
  disabled={deletingScans.has(job.id)}
  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1 rounded text-white text-xs transition-colors"
>
  {deletingScans.has(job.id) ? '...' : 'Delete'}
</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedJobs().length)} of {filteredAndSortedJobs().length} results
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded text-sm border border-gray-600 text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <span className="px-3 py-1 text-sm text-gray-300">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded text-sm border border-gray-600 text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}