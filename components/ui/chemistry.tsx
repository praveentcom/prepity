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

        if (!response.ok) {
          throw new Error('Failed to render chemical structure');
        }

        const data = await response.json();
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
  }, [content]);

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
      <div className={`inline-block p-2 border border-red-200 rounded bg-red-50 text-red-600 text-xs font-mono ${className || ''}`}>
        Error: {error}
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
