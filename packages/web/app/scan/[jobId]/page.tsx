
'use client'

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    loadScanData();
  }, [jobId, isAuthenticated, router]);

  const loadScanData = async () => {
    try {
      setLoading(true);

      // Get job status
      const jobData = await apiClient.getScanStatus(jobId);
      setJob(jobData);

      // If job is completed, get results
      if (jobData.status === 'completed') {
        const results = await apiClient.getScanResults(jobId);
        setResultsData(results);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan data');
    } finally {
      setLoading(false);
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
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  if (loading) {
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
          <button 
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
          >
            Back to Dashboard
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
              <button className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-white text-sm transition-colors">
                Export PDF
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-white text-sm transition-colors">
                Share Scan
              </button>
            </div>
          </div>
        </div>

        {/* Job Status */}
        {job.status === 'running' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-3"></div>
              <div>
                <h3 className="text-yellow-500 font-medium">Scan in Progress</h3>
                <p className="text-gray-300 text-sm">
                  {job.progress ? `${job.progress.current}/${job.progress.total} files scanned` : 'Starting scan...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
            <h3 className="text-red-500 font-medium mb-2">Scan Failed</h3>
            <p className="text-gray-300 text-sm">{job.error || 'An unknown error occurred during scanning'}</p>
          </div>
        )}

        {/* Results Content */}
        {job.status === 'completed' && resultsData && (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">{resultsData.stats.keys_found}</div>
                  <div className="text-sm text-gray-300">Keys Found</div>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500 mb-2">{resultsData.stats.high_severity}</div>
                  <div className="text-sm text-gray-300">High Risk</div>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">{resultsData.stats.files_scanned}</div>
                  <div className="text-sm text-gray-300">Files Scanned</div>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">{Math.round(resultsData.stats.duration_ms / 1000)}s</div>
                  <div className="text-sm text-gray-300">Scan Time</div>
                </div>
              </div>
            </div>

            {/* Vault Conversion CTA */}
            {resultsData.stats.keys_found > 0 && (
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
                        🚨 {resultsData.stats.keys_found} Exposed API Keys Found!
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
              
              <div className="overflow-x-auto">
                {resultsData.results.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No Issues Found!</h3>
                    <p className="text-gray-300">Your repository appears to be free of exposed API keys.</p>
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
                        <tr key={index} className="hover:bg-slate-700">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button className="text-blue-400 hover:text-blue-300 mr-4">
                              Fix
                            </button>
                            <button className="text-gray-400 hover:text-gray-300">
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
              Store your {resultsData?.stats.keys_found} exposed API keys in an encrypted vault. 
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