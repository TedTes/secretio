'use client'

import { useEffect, useState,Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

function VaultSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      router.push('/vault/upgrade');
      return;
    }

    // Verify the session was successful
    // Update user subscription status
    // This could involve calling your backend to confirm the subscription

    setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, [isAuthenticated, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
   
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome to Vault Pro!
        </h1>
        
        <p className="text-gray-300 mb-8">
          Your subscription is now active. You can start storing API keys securely in your encrypted vault.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => router.push('/vault')}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
          >
            Access Your Vault
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>

  );
}

export default function VaultSuccessPage() {
  return (
    <Suspense fallback={<div>Loading GitHub callback...</div>}>
      <VaultSuccessClient />
    </Suspense>
  );
}