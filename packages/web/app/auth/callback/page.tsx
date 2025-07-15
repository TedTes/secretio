// app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api';
export default function AuthCallback() {
  const router = useRouter();
  const { refreshToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshTokenParam = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Check for errors
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          
          // Redirect to home after showing error
          setTimeout(() => {
            router.push('/');
          }, 3000);
          return;
        }

        // Check for tokens
        if (!accessToken) {
          setStatus('error');
          setMessage('No access token received');
          setTimeout(() => {
            console.log("helloooalldlf")
            router.push('/');
          }, 3000);
          return;
        }

        // Store tokens in localStorage (Supabase handles this automatically, but just in case)
        localStorage.setItem('access_token', accessToken);
        if (refreshTokenParam) {
          localStorage.setItem('refresh_token', refreshTokenParam);
        }

        // // Update auth context (this will trigger a re-fetch of user data)
        apiClient.setToken(accessToken);

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        // Redirect to dashboard or intended destination
        const redirectTo = localStorage.getItem('auth_redirect') || '/dashboard';
        localStorage.removeItem('auth_redirect'); // Clean up

        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);

      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('Failed to process authentication');
        
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      handleCallback();
    }
  }, [router, refreshToken]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-slate-800 rounded-lg border border-gray-700 p-8 text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-bold text-white mb-2">Processing Authentication</h2>
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
              <h2 className="text-xl font-bold text-white mb-2">Welcome!</h2>
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
              <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
              <p className="text-gray-300 mb-4">{message}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white transition-colors"
              >
                Return Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
