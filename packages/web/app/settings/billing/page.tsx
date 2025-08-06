'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '../../hooks/useSubscription';
import SubscriptionStatus from '../../components/SubscriptionStatus';

export default function BillingPage() {
  const router = useRouter();
  const { subscriptionData, loading, refreshSubscription } = useSubscription();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCancelSubscription = async () => {
    if (!subscriptionData?.subscription?.stripe_subscription_id) return;

    setCancelling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message);
        await refreshSubscription();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Cancel subscription failed:', err);
      setError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscriptionData?.subscription?.stripe_customer_id) return;

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
      setError('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-300">
            Manage your Vault Pro subscription and billing details
          </p>
        </div>

        {error && (
          <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200 text-sm mt-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-600/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <p className="text-green-400">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-300 hover:text-green-200 text-sm mt-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Current Subscription */}
          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Current Plan</h2>
            <SubscriptionStatus showUpgradeButton={!subscriptionData?.hasActiveSubscription} />
          </div>

          {/* Subscription Details */}
          {subscriptionData?.subscription && (
            <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Subscription Details</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Plan</p>
                  <p className="text-white font-semibold">Vault Pro ($15/month)</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="text-white font-semibold capitalize">
                    {subscriptionData.subscription.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Current Period Start</p>
                  <p className="text-white">
                    {new Date(subscriptionData.subscription.current_period_start).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Current Period End</p>
                  <p className="text-white">
                    {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Actions */}
          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Billing Actions</h2>
            
            <div className="space-y-4">
              {subscriptionData?.hasActiveSubscription ? (
                <>
                  <button
                    onClick={handleManageSubscription}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
                  >
                    Manage Billing & Payment Methods
                  </button>
                  
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 px-6 py-3 rounded-lg text-white transition-colors disabled:cursor-not-allowed"
                  >
                    {cancelling ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Cancelling...
                      </div>
                    ) : (
                      'Cancel Subscription'
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/vault/upgrade')}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
                >
                  Upgrade to Vault Pro
                </button>
              )}
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-slate-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Billing History</h2>
            <p className="text-gray-400 text-sm">
              For detailed billing history and invoices, use the "Manage Billing" button above to access your Stripe customer portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}