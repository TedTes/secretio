'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from '../components/auth/UserMenu';
interface VaultKey {
  id: string;
  keyName: string;
  service: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
}

export default function VaultPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [keys, setKeys] = useState<VaultKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState('production');
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    loadVaultKeys();
  }, [isAuthenticated, environment]);

  const loadVaultKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/vault/keys?environment=${environment}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load vault keys');
      }

      const data = await response.json();
      setKeys(data.data.keys);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vault keys');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (keyName: string) => {
    if (!confirm(`Are you sure you want to delete "${keyName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingKeys(prev => new Set([...prev, keyName]));

      const response = await fetch(`/api/vault/keys/${keyName}?environment=${environment}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete key');
      }

      // Remove from local state
      setKeys(prev => prev.filter(key => key.keyName !== keyName));
      alert(`Key "${keyName}" deleted successfully`);

    } catch (err) {
      alert('Failed to delete key: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(keyName);
        return newSet;
      });
    }
  };

  const handleCopyIntegration = (keyName: string) => {
    const code = `// Replace hardcoded keys with vault calls
const apiKey = await vault.getKey('${keyName}');

// Or using environment variables:
// VAULT_KEY_${keyName.toUpperCase()}=${keyName}`;

    navigator.clipboard.writeText(code);
    alert('Integration code copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('stripe')) return '💳';
    if (service.includes('openai')) return '🤖';
    if (service.includes('github')) return '🐙';
    if (service.includes('aws')) return '☁️';
    if (service.includes('google')) return '🔍';
    return '🔑';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">Please log in to access your vault.</p>
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
              <h1 className="text-lg font-semibold text-white">Vault</h1>
            </div>
            
            {/* ADD UserMenu instead of basic welcome text */}
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Secure Vault</h1>
            <p className="text-gray-300 mt-2">Manage your encrypted API keys safely</p>
          </div>

          {/* Environment Selector */}
          <div className="flex items-center space-x-3">
            <label className="text-gray-300 text-sm">Environment:</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="bg-slate-800 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Loading vault keys...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
            <h3 className="text-red-500 font-medium mb-2">Error</h3>
            <p className="text-gray-300 text-sm">{error}</p>
            <button 
              onClick={loadVaultKeys}
              className="mt-3 bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && keys.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No API Keys Stored</h3>
            <p className="text-gray-300 mb-6">
              Start by scanning your repositories to find and secure exposed API keys.
            </p>
            <button
              onClick={() => router.push('/scan/new')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
            >
              Scan Repository
            </button>
          </div>
        )}

        {/* Keys List */}
        {!loading && !error && keys.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  Stored Keys ({keys.length})
                </h2>
                <div className="text-sm text-gray-400">
                  Environment: <span className="text-white font-medium">{environment}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Key Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Accessed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-gray-700">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getServiceIcon(key.service)}</span>
                          <div>
                            <div className="text-sm font-medium text-white">{key.service}</div>
                            <div className="text-sm text-gray-400">API Key</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm bg-slate-700 px-2 py-1 rounded text-blue-400">
                          {key.keyName}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {key.lastAccessed ? formatDate(key.lastAccessed) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleCopyIntegration(key.keyName)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white transition-colors"
                        >
                          📋 Copy Code
                        </button>
                        <button
                          onClick={() => handleDeleteKey(key.keyName)}
                          disabled={deletingKeys.has(key.keyName)}
                          className={`px-3 py-1 rounded text-white transition-colors ${
                            deletingKeys.has(key.keyName)
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {deletingKeys.has(key.keyName) ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}