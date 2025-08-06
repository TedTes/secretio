import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionData {
  subscription: {
    id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    plan_id: string;
    current_period_start: string;
    current_period_end: string;
  } | null;
  hasActiveSubscription: boolean;
  tier: 'free' | 'pro';
}

interface UseSubscriptionReturn {
  subscriptionData: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSubscriptionData(result.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch subscription');
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
      setError('Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [isAuthenticated, user]);

  const refreshSubscription = async () => {
    setLoading(true);
    await fetchSubscription();
  };

  return {
    subscriptionData,
    loading,
    error,
    refreshSubscription
  };
}