import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    value={value}
    max={max}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="ui-progress-indicator h-full w-full flex-1 bg-primary motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
      style={{ transform: `translateX(${(Math.min(max, Math.max(0, value ?? 0)) / max - 1) * 100}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
