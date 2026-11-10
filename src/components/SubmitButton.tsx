"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

/** A submit button that shows a spinner + pending text while its form's server action runs. */
export function SubmitButton({ children, pendingText, className = "btn btn--primary", icon, disabled, ...rest }: {
  children: React.ReactNode; pendingText?: string; className?: string; icon?: React.ReactNode; disabled?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" className={className} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : icon}
      <span>{pending && pendingText ? pendingText : children}</span>
    </button>
  );
}
