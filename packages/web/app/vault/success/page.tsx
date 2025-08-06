'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setVerifying(false);
        return;
      }

      try {
        // Verify the session with your backend 
        const response = await fetch(`/api/billing/verify-session?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          // Success verified
          setTimeout(() => {
            router.push('/vault');
          }, 3000);
        } else {
          // Still redirect even if verification fails - webhook should handle it
          setTimeout(() => {
            router.push('/vault');
          }, 3000);
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
        // Still redirect - webhook should have processed payment
        setTimeout(() => {
          router.push('/vault');
        }, 3000);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">Please log in to view this page.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-red-400 mb-4">Payment Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/vault/upgrade')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-lg mx-4">
        {/* Success Animation */}
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold text-green-400 mb-4">
          🎉 Payment Successful!
        </h1>
        
        <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Welcome to Vault Pro!</h2>
          <p className="text-gray-300 mb-4">
            Your payment has been processed successfully. You now have access to:
          </p>
          
          <ul className="text-left space-y-2 text-gray-300">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited encrypted API key storage
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Advanced repository scanning
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Team collaboration features
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority support
            </li>
          </ul>
        </div>

        {verifying ? (
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
              <span className="text-blue-400">Verifying payment...</span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-blue-400">
              Redirecting you to your vault in a few seconds...
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/vault')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-white font-semibold transition-colors"
          >
            Go to Vault Now
          </button>
          
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors underline"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-8">
          Session ID: {sessionId}
        </p>
      </div>
    </div>
  );
}