import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CircleButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function CircleButton({
  className,
  children,
  ...props
}: CircleButtonProps) {
  return (
    <button
      className={cn(
        "flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-center text-sm font-medium leading-tight text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
