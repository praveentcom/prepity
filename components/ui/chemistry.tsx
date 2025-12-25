'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ChemistryProps {
  content: string;
  className?: string;
}

/**
 * A component that renders chemical structures using the official chemfig package via a QuickLaTeX proxy.
 */
export const Chemistry: React.FC<ChemistryProps> = ({ content, className }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchImage = async () => {
      try {
        const response = await fetch('/api/render-chemistry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to render chemical structure');
        }

        if (isMounted) {
          setImageUrl(data.url);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [content, retryCount]);

  if (isLoading) {
    return (
      <div className={`inline-flex items-center justify-center p-4 border rounded-lg bg-muted/50 ${className || ''}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground animate-pulse">Rendering structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex flex-col gap-2 p-3 border border-red-200 rounded-lg bg-red-50/50 ${className || ''}`}>
        <div className="flex items-center gap-2 text-red-600">
          <span className="text-xs font-medium">Rendering failed</span>
          <button 
            onClick={() => setRetryCount(prev => prev + 1)}
            className="text-[10px] px-2 py-0.5 bg-red-100 hover:bg-red-200 rounded border border-red-300 transition-colors"
          >
            Retry
          </button>
        </div>
        <p className="text-[10px] text-red-500 font-mono leading-tight max-w-[200px]">
          {error}
        </p>
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className={`inline-block align-middle my-4 bg-white p-2 rounded-md shadow-sm border ${className || ''}`}>
      <img 
        src={imageUrl} 
        alt={`Chemical structure: ${content}`}
        className="max-w-full h-auto block"
        style={{ minHeight: '100px' }}
      />
    </div>
  );
};
