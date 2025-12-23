'use client';

import { Request } from '@prisma/client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

/**
 * RequestsContextType is the type for the requests context.
 * @property requests - The requests
 * @property setRequests - The function to set the requests
 * @property isLoading - The loading state
 * @property setIsLoading - The function to set the loading state
 */
interface RequestsContextType {
  requests: Request[];
  setRequests: (requests: Request[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RequestsContext = createContext<RequestsContextType | undefined>(
  undefined
);

/**
 * RequestsProvider is a context provider for the requests state.
 * It is used to provide the requests state to the application.
 * @param children - The children components
 * @param initialRequests - The initial requests
 * @returns The RequestsProvider component
 */
export function RequestsProvider({
  children,
  initialRequests = [],
}: {
  children: ReactNode;
  initialRequests?: Request[];
}) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialRequests.length > 0) {
      setRequests(initialRequests);
    }
  }, [initialRequests]);

  return (
    <RequestsContext.Provider
      value={{ requests, setRequests, isLoading, setIsLoading }}
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
