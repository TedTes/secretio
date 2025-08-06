'use client'

import { useSubscription } from '../hooks/useSubscription';
import { useRouter } from 'next/navigation';

interface SubscriptionStatusProps {
  showUpgradeButton?: boolean;
  compact?: boolean;
}

export default function SubscriptionStatus({ 
  showUpgradeButton = true, 
  compact = false 
}: SubscriptionStatusProps) {

  const { subscriptionData, loading } = useSubscription();
  const router = useRouter();

  if (loading) {
    return (
      <div className={`${compact ? 'p-2' : 'p-4'} bg-slate-800 rounded-lg border border-gray-700`}>
        <div className="animate-pulse flex items-center">
          <div className="h-4 bg-gray-600 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const isActive = subscriptionData?.hasActiveSubscription;
  const status = subscriptionData?.subscription?.status || 'free';

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
        <span className={`text-sm ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
          {isActive ? 'Pro' : 'Free'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {isActive ? 'Vault Pro' : 'Free Plan'}
          </h3>
          <p className="text-sm text-gray-400">
            Status: <span className={isActive ? 'text-green-400' : 'text-gray-400'}>
              {status === 'free' ? 'Free Plan' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </p>
          
          {subscriptionData?.subscription?.current_period_end && (
            <p className="text-xs text-gray-500 mt-1">
              {status === 'active' ? 'Renews' : 'Ends'} on{' '}
              {new Date(subscriptionData.subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          {isActive ? (
            <button
              onClick={() => {
                // Handle manage subscription - open Stripe portal
                const manageSubscription = async () => {
                  try {
                    const response = await fetch('/api/billing/create-portal-session', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        customerId: subscriptionData.subscription?.stripe_customer_id
                      })
                    });

                    if (response.ok) {
                      const { data } = await response.json();
                      window.location.href = data.url;
                    }
                  } catch (error) {
                    console.error('Failed to open billing portal:', error);
                  }
                };
                manageSubscription();
              }}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-white text-sm transition-colors"
            >
              Manage
            </button>
          ) : (
            showUpgradeButton && (
              <button
                onClick={() => router.push('/vault/upgrade')}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white text-sm transition-colors"
              >
                Upgrade
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}