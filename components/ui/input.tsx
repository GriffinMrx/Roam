import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

/*
 * Field specs (design system §08):
 * - Height 44px
 * - Radius 12px
 * - Border 1px solid Neutral 200 (#1C1C1F)
 * - Padding 0 16px
 * - Focus: border Primary 400 (#C084FC)
 */

const field =
  "flex h-11 w-full items-center gap-3 rounded-md border border-border bg-surface px-4 text-body text-foreground transition-colors hover:border-neutral-300 focus-within:border-primary-400 focus-within:hover:border-primary-400 has-disabled:cursor-not-allowed has-disabled:opacity-50";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: IconName;
  /** Content after the input, e.g. a keyboard shortcut hint. */
  trailing?: ReactNode;
  /** "md" is the 44px spec field; "lg" is the hero-sized search field. */
  fieldSize?: "md" | "lg";
};

export function Input({
  leadingIcon,
  trailing,
  fieldSize = "md",
  className,
  ...props
}: InputProps) {
  const lg = fieldSize === "lg";

  return (
    <div className={cn(field, lg && "h-16 gap-4 rounded-lg px-6 text-body-lg shadow-sm", className)}>
      {leadingIcon && (
        <Icon name={leadingIcon} size={lg ? 24 : 18} className="shrink-0 text-subtle" />
      )}
      <input
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle focus-visible:outline-none disabled:cursor-not-allowed"
        {...props}
      />
      {trailing}
    </div>
  );
}

export function Kbd({ boxed, children }: { boxed?: boolean; children: ReactNode }) {
  return (
    <kbd
      className={cn(
        "font-sans text-small font-medium text-muted",
        boxed && "rounded-sm border border-border bg-neutral-50 px-2 py-1",
      )}
    >
      {children}
    </kbd>
  );
}

export function SearchInput({
  fieldSize,
  ...props
}: Omit<InputProps, "leadingIcon" | "type">) {
  return (
    <Input
      type="search"
      leadingIcon="search"
      placeholder="Search anything..."
      fieldSize={fieldSize}
      trailing={<Kbd boxed={fieldSize === "lg"}>⌘ K</Kbd>}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn(field, "relative px-0", className)}>
      <select
        className="h-full w-full cursor-pointer appearance-none bg-transparent px-4 pr-11 outline-none focus-visible:outline-none disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={18}
        className="pointer-events-none absolute right-4 text-muted"
      />
    </div>
  );
}
