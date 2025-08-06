'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import {IUserSubscription} from "../../lib/types";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionData {
  subscription: IUserSubscription;
  hasActiveSubscription: boolean;
  tier: 'free' | 'pro';
}

export default function VaultUpgradePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Check current subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const response = await fetch('/api/billing/subscription', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          setSubscriptionData(result.data);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    checkSubscription();
  }, [isAuthenticated, user]);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
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

  const handleManageSubscription = async () => {
    if (!subscriptionData?.subscription?.stripe_customer_id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customerId: subscriptionData.subscription.stripe_customer_id
        })
      });

      if (response.ok) {
        const { data } = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
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

  if (loadingSubscription) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  // If user already has active subscription
  if (subscriptionData?.hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Vault Pro Active
            </h1>
            <p className="text-xl text-green-400">
              ✅ You&apos;re all set with enterprise-grade security
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg border border-green-600 p-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">Vault Pro</h2>
              <div className="text-gray-400 mb-6">
                Status: <span className="text-green-400 font-semibold">Active</span>
              </div>
              
              <div className="space-y-4 mb-8">
                <button
                  onClick={() => router.push('/vault')}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
                >
                  Go to Vault
                </button>
                
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Manage Subscription'}
                </button>
              </div>
            </div>
          </div>
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
            
            <ul className="text-left space-y-3 mb-8 text-gray-300">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Unlimited API key storage
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AES-256 encryption
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Automated repository scanning
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Team collaboration
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Automatic key rotation
              </li>
            </ul>

            {error && (
              <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 px-6 py-3 rounded-lg text-white font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Upgrade Now'
              )}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Cancel anytime. No setup fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}