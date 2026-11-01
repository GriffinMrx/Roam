import Link from "next/link";
import { SignInLink } from "@/components/sign-in-link";
import { TeachButton } from "@/components/teach-button";
import { Icon, Navbar, buttonStyles, type NavItem } from "@/components/ui";

const navItems = [
  { key: "courses", label: "Courses", href: "/courses" },
  { key: "my-learning", label: "My Learning", href: "/my-learning" },
] as const;

/**
 * Sign in and the settings gear are both in the HTML; the data-auth hint set before the first
 * paint (lib/auth-hint.ts) shows one of them. Clerk's <Show> only decided after Clerk loaded,
 * so the slot was empty, then shifted the header, on every reload. Display only: /settings is
 * protected on the server either way.
 */
function AccountSlot() {
  return (
    <>
      <SignInLink className={`${buttonStyles({ variant: "glossy-light" })} auth-signed-out`}>Sign in</SignInLink>
      <Link
        href="/settings"
        aria-label="Settings"
        className="auth-signed-in flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-neutral-100"
      >
        <Icon name="settings" size={24} />
      </Link>
    </>
  );
}

export function SiteHeader({ active }: { active?: (typeof navItems)[number]["key"] } = {}) {
  const items: NavItem[] = navItems.map(({ label, href, key }) => ({ label, href, active: key === active }));

  return (
    <header className="sticky top-0 z-50 flex h-24 items-center justify-between border-b border-ink/5 bg-background/30 px-6 backdrop-blur-xl backdrop-saturate-150 sm:px-10">
      {/* No mobile menu in the reference yet: links are hidden below sm */}
      <Navbar items={items} linksClassName="hidden sm:flex" />
      <div className="flex items-center gap-2">
        <TeachButton />
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-neutral-100"
        >
          <Icon name="bell" size={24} />
        </button>
        <AccountSlot />
      </div>
    </header>
  );
}
