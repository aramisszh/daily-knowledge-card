import * as React from "react";

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
  size?: "default" | "sm";
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition disabled:pointer-events-none disabled:opacity-50",
        variant === "default" ? "bg-slate-900 text-white hover:bg-slate-800" : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        className
      )}
      {...props}
    />
  );
}
