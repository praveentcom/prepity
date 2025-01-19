import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { BookOpenCheckIcon } from "lucide-react"
import { cn } from "@/lib/client/utils"

const logoVariants = cva(
  "flex items-center font-semibold",
  {
    variants: {
      variant: {
        default: "text-foreground",
        primary: "text-primary",
        muted: "text-muted-foreground",
      },
      size: {
        default: "[&_svg]:size-5 text-base",
        sm: "[&_svg]:size-4 text-sm",
        lg: "[&_svg]:size-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LogoProps
  extends React.HTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof logoVariants> {
  asChild?: boolean
  href?: string
}

const Logo = React.forwardRef<HTMLAnchorElement, LogoProps>(
  ({ className, variant, size, asChild = false, href = "/", ...props }, ref) => {
    const Comp = asChild ? Slot : "a"
    return (
      <Comp
        href={href}
        className={cn(logoVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <BookOpenCheckIcon />
        Prepity
      </Comp>
    )
  }
)
Logo.displayName = "Logo"

export { Logo, logoVariants }
