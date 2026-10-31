import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

/*
 * Button specs (design system §07):
 * - Height 44px (default)
 * - Padding 0 16px (lg), 0 12px (md)
 * - Radius 12px
 * - Font Plus Jakarta Sans Medium, 14–16px
 *
 * `data-hover` forces the hover look, for documentation only.
 */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text";
export type ButtonSize = "lg" | "md";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-sm hover:bg-primary-600 data-hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300 disabled:shadow-none",
  secondary:
    "border border-primary-400 bg-surface text-primary-500 hover:bg-primary-100 data-hover:bg-primary-100 disabled:border-primary-200 disabled:bg-surface disabled:text-primary-300",
  tertiary:
    "border border-border bg-surface text-foreground hover:border-neutral-300 hover:bg-neutral-50 data-hover:border-neutral-300 data-hover:bg-neutral-50 disabled:border-neutral-100 disabled:bg-surface disabled:text-neutral-300",
  text: "text-primary-500 hover:text-primary-600 data-hover:text-primary-600 disabled:text-primary-200",
};

const sizes: Record<ButtonSize, string> = {
  lg: "h-11 px-4 text-body-lg",
  md: "h-10 px-3 text-body",
};

export function buttonStyles({
  variant = "primary",
  size = "lg",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    sizes[size],
    variant === "text" && "px-0",
    variants[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing icon. */
  icon?: IconName;
  "data-hover"?: boolean;
};

export function Button({
  variant = "primary",
  size = "lg",
  icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {children}
      {icon && <Icon name={icon} size={16} />}
    </button>
  );
}
