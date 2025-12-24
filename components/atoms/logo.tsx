import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { BookOpenCheckIcon } from 'lucide-react';
import { cn } from '@/lib/client/utils';
import Link from 'next/link';
import Image from 'next/image';

const logoVariants = cva('flex items-center font-semibold', {
  variants: {
    variant: {
      default: 'text-foreground',
      primary: 'text-primary',
      muted: 'text-muted-foreground',
    },
    size: {
      default: '[&_svg]:size-5 text-base',
      sm: '[&_svg]:size-4 text-sm',
      lg: '[&_svg]:size-6 text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface LogoProps
  extends
    React.HTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof logoVariants> {
  asChild?: boolean;
  href?: string;
}

const Logo = React.forwardRef<HTMLAnchorElement, LogoProps>(
  (
    { className, variant, size, href = '/', ...props },
    ref
  ) => {
    return (
      <Link
        href={href}
        className={cn(logoVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <Image src="/logo.png" alt="Prepity" width={100} height={100} className='size-8 dark:hidden' />
        <Image src="/logo-dark.png" alt="Prepity" width={100} height={100} className='size-8 hidden dark:block' />
      </Link>
    );
  }
);
Logo.displayName = 'Logo';

export { Logo, logoVariants };
