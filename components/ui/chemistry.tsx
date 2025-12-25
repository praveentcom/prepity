'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ChemistryProps {
  content: string;
  className?: string;
}

import { chemistryBatcher } from '@/lib/client/chemistry';
import clsx from 'clsx';

/**
 * A component that renders chemical structures using the official chemfig package via a QuickLaTeX proxy.
 */
export const Chemistry: React.FC<ChemistryProps> = ({ content, className = '' }) => {
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
        const url = await chemistryBatcher.fetch(content);
        if (isMounted) {
          setImageUrl(url);
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
      <span className="inline-flex p-2">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </span>
    );
  }

  if (error) {
    return null;
  }

  if (!imageUrl) return null;

  return (
    <span className={clsx(
      "inline-flex align-middle dark:brightness-0 dark:invert",
      className
    )}>
      <img 
        src={imageUrl} 
        alt={`Chemical structure: ${content}`}
        className="h-auto max-h-[5em] max-w-[8em] w-auto shrink-0"
        loading="lazy"
      />
    </span>
  );
};
