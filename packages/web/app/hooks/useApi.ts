'use client'

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface UseApiOptions {
  immediate?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const { immediate = false } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API call failed';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    refetch: execute,
  };
}

// Specific hooks for common API calls
export function useUserJobs() {
  return useApi(() => apiClient.getUserJobs());
}

export function useUserStats() {
  return useApi(() => apiClient.getUserStats());
}

export function useScanStatus(jobId: string | null) {
  return useApi(() => {
    if (!jobId) throw new Error('Job ID required');
    return apiClient.getScanStatus(jobId);
  });
}

export function useScanResults(jobId: string | null) {
  return useApi(() => {
    if (!jobId) throw new Error('Job ID required');
    return apiClient.getScanResults(jobId);
  });
}