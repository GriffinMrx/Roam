import Link from "next/link";
import { Suspense } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { Icon, Navbar, buttonStyles, type NavItem } from "@/components/ui";

const navItems = [
  { key: "courses", label: "Courses", href: "/courses" },
  { key: "my-learning", label: "My Learning", href: "/my-learning" },
] as const;

/** Holds the gear's space while auth resolves, so the header doesn't shift. */
function AccountPlaceholder() {
  return <span aria-hidden className="size-11" />;
}

export function SiteHeader({ active }: { active?: (typeof navItems)[number]["key"] } = {}) {
  const items: NavItem[] = navItems.map(({ label, href, key }) => ({ label, href, active: key === active }));

  return (
    <header className="sticky top-0 z-50 flex h-24 items-center justify-between border-b border-white/5 bg-background/30 px-6 backdrop-blur-xl backdrop-saturate-150 sm:px-10">
      {/* No mobile menu in the reference yet: links are hidden below sm */}
      <Navbar items={items} linksClassName="hidden sm:flex" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-neutral-100"
        >
          <Icon name="bell" size={24} />
        </button>
        {/* Auth reads the request, so it must sit inside Suspense (cacheComponents) */}
        <Suspense fallback={<AccountPlaceholder />}>
          <Show when="signed-out">
            <SignInButton>
              <button
                type="button"
                className={buttonStyles({ variant: "glossy-light" })}
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-neutral-100"
            >
              <Icon name="settings" size={24} />
            </Link>
          </Show>
        </Suspense>
      </div>
    </header>
  );
}
