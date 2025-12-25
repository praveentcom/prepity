import { cn } from '@workspace/ui/lib/utils';
import React from 'react';

export interface BlockquoteProps extends React.ComponentProps<'blockquote'> {
  /**
   * Whether this is a nested blockquote (affects styling)
   */
  nested?: boolean;
}

/**
 * A styled blockquote component for displaying quoted content
 *
 * @param nested - Whether this blockquote is nested within another
 * @param className - Additional CSS classes
 * @param children - The blockquote content
 */
function Blockquote({
  nested = false,
  className,
  children,
  ...props
}: BlockquoteProps) {
  return (
    <blockquote
      data-slot="blockquote"
      className={cn(
        'relative w-full min-w-0 overflow-hidden pl-6 py-2 pr-5 bg-muted border border-border/75 rounded-md leading-relaxed text-foreground',
        nested ? 'my-2' : 'mb-5',
        className
      )}
      {...props}
    >
      {!nested && (
        <div className="absolute left-2 top-2 bottom-2 w-1 bg-foreground/80 rounded-sm" />
      )}
      {children}
    </blockquote>
  );
}

export { Blockquote };
