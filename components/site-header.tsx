import { Icon, Navbar, type NavItem } from "@/components/ui";

const navItems: NavItem[] = [
  { label: "Courses", href: "/#courses" },
  { label: "My Learning", href: "#" },
];

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
        <span
          role="img"
          aria-label="Your profile"
          className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-500 ring-2 ring-surface"
        >
          <Icon name="user" size={24} />
        </span>
      </div>
    </header>
  );
}
