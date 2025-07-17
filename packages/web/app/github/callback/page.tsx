'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '../../lib/api';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing GitHub connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        // Check for OAuth errors
        if (error) {
          console.error('GitHub OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'GitHub authorization was denied');
          
          setTimeout(() => {
            router.push('/scan/new');
          }, 3000);
          return;
        }


        if(!code || state !== 'repo-access') {
            setStatus('error');
           let message =  !code ? 'No authorization code received' : 'Invalid OAuth state';
           setMessage(message);
           setTimeout(() => {
            router.push('/scan/new');
          }, 3000);
          return;
        }

        // Verify state parameter & Check for authorization code
        if (state !== 'repo-access') {
          setStatus('error');
          setMessage('Invalid OAuth state');
          setTimeout(() => {
            router.push('/scan/new');
          }, 3000);
          return;
        }

        setMessage('Exchanging authorization code...');

        // Exchange code for access token
        await apiClient.exchangeCodeForToken(code,state);

        setMessage('Loading GitHub user data...');

        // Get user info to verify token works
        // await apiClient.getUser();

        setStatus('success');
        setMessage('GitHub connected successfully! Redirecting...');

        // Redirect back to scan page with success
        setTimeout(() => {
          router.push('/scan/new?github=connected');
        }, 1500);

      } catch (error) {
        console.error('GitHub callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect GitHub');
        
        setTimeout(() => {
          router.push('/scan/new?github=error');
        }, 3000);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleCallback();
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-8 text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-white mb-2">Connecting GitHub</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">GitHub Connected!</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
              <p className="text-gray-300 mb-4">{message}</p>
              <button
                onClick={() => router.push('/scan/new')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}