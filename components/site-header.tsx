import { Suspense } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Icon, Navbar, buttonStyles, type NavItem } from "@/components/ui";

const navItems: NavItem[] = [
  { label: "Courses", href: "/#courses" },
  { label: "My Learning", href: "#" },
];

function AvatarPlaceholder() {
  return (
    <span
      role="img"
      aria-label="Your profile"
      className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-500 ring-2 ring-surface"
    >
      <Icon name="user" size={24} />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="flex h-24 items-center justify-between border-b border-border px-6 sm:px-10">
      {/* No mobile menu in the reference yet: links are hidden below sm */}
      <Navbar items={navItems} linksClassName="hidden sm:flex" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-neutral-100"
        >
          <Icon name="bell" size={24} />
        </button>
        {/* Auth reads the request, so it must sit inside Suspense (cacheComponents) */}
        <Suspense fallback={<AvatarPlaceholder />}>
          <Show when="signed-out">
            <SignInButton>
              <button
                type="button"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton
              appearance={{ elements: { avatarBox: "size-12 ring-2 ring-surface" } }}
            />
          </Show>
        </Suspense>
      </div>
    </header>
  );
}
