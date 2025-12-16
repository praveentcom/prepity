'use client';

import { Request } from '@prisma/client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RequestsContextType {
  requests: Request[];
  setRequests: (requests: Request[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RequestsContext = createContext<RequestsContextType | undefined>(undefined);

export function RequestsProvider({ 
  children, 
  initialRequests = [] 
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
    <RequestsContext.Provider value={{ requests, setRequests, isLoading, setIsLoading }}>
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestsProvider');
  }
  return context;
}

