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

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text" | "glossy" | "glossy-light";
export type ButtonSize = "lg" | "md";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-sm hover:bg-primary-600 data-hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300 disabled:shadow-none",
  secondary:
    "border border-primary-400 bg-surface text-primary-500 hover:bg-primary-100 data-hover:bg-primary-100 disabled:border-primary-200 disabled:bg-surface disabled:text-primary-300",
  tertiary:
    "border border-border bg-surface text-foreground hover:border-neutral-300 hover:bg-neutral-50 data-hover:border-neutral-300 data-hover:bg-neutral-50 disabled:border-neutral-100 disabled:bg-surface disabled:text-neutral-300",
  text: "text-primary-500 hover:text-primary-600 data-hover:text-primary-600 disabled:text-primary-200",
  // Glossy pills (learning actions, header Sign in). Literal grays: the theme's neutral
  // scale is inverted for dark mode. They set their own shape and size (see buttonStyles).
  glossy:
    "h-12 rounded-full border border-[#a1a1aa] bg-linear-to-b from-[#e4e4e7] to-[#a1a1aa] px-6 text-body-lg text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.35)] hover:from-[#f4f4f5] hover:to-[#b4b4bb] data-hover:from-[#f4f4f5] data-hover:to-[#b4b4bb]",
  "glossy-light":
    "h-12 rounded-full border border-[#d4d4d8] bg-linear-to-b from-white to-[#d4d4d8] px-6 text-body-lg text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.25)] hover:to-[#b4b4bb] data-hover:to-[#b4b4bb]",
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
  // cn() doesn't merge conflicting utilities, so glossy pills skip the default radius and size
  const glossy = variant === "glossy" || variant === "glossy-light";
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    !glossy && "rounded-md",
    !glossy && sizes[size],
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
