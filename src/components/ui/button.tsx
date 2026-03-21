import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-lg hover:brightness-110 hover:shadow-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:brightness-110",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-foreground hover:border-primary/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-125",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "text-white shadow-lg hover:shadow-xl hover:brightness-110 border-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const gradientStyle = variant === "gradient" 
      ? { 
          ...style,
          backgroundImage: 'linear-gradient(135deg, hsl(210 100% 60%), hsl(270 65% 62%), hsl(185 80% 55%))',
          backgroundSize: '200% 200%',
        } 
      : style;
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} style={gradientStyle} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
