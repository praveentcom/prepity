'use client';

import { Request } from '@prisma/client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';

/**
 * RequestsContextType is the type for the requests context.
 * @property requests - The requests
 * @property setRequests - The function to set the requests
 * @property isLoading - The loading state
 * @property refreshRequests - The function to refresh the requests
 */
interface RequestsContextType {
  requests: Request[];
  setRequests: (requests: Request[]) => void;
  isLoading: boolean;
  refreshRequests: () => Promise<void>;
}

const RequestsContext = createContext<RequestsContextType | undefined>(
  undefined
);

/**
 * RequestsProvider is a context provider for the requests state.
 * It is used to provide the requests state to the application.
 * @param children - The children components
 * @returns The RequestsProvider component
 */
export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/requests/list?limit=100');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  return (
    <RequestsContext.Provider
      value={{ requests, setRequests, isLoading, refreshRequests }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

/**
 * useRequests is a hook to access the requests state.
 * @returns The requests state
 */
export function useRequests() {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestsProvider');
  }
  return context;
}
