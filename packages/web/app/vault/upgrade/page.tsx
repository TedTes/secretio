'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function VaultUpgradePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!isAuthenticated || !user) {
      router.push('/');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_VAULT_PRICE_ID
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { data } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        throw new Error(error.message);
      }

    } catch (err) {
      console.error('Upgrade failed:', err);
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300">Please log in to upgrade your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Upgrade to Vault Pro
          </h1>
          <p className="text-xl text-gray-300">
            Secure your API keys with enterprise-grade encryption
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-gray-700 p-8 max-w-md mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Vault Pro</h2>
            <div className="text-4xl font-bold text-blue-400 mb-2">$15</div>
            <div className="text-gray-400 mb-6">per month</div>
            
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited API key storage
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                AES-256 encryption
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Automatic key rotation
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                API access & SDKs
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Priority support
              </li>
            </ul>

            {error && (
              <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-3 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {loading ? 'Processing...' : 'Upgrade Now'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Cancel anytime. No long-term contracts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}