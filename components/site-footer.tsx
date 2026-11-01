import Link from "next/link";
import { FooterBars } from "@/components/footer-bars";
import { Logo } from "@/components/ui";

const columns = [
  {
    title: "Learn",
    links: [
      { label: "All Courses", href: "/courses" },
      { label: "My Learning", href: "/my-learning" },
      { label: "Saved", href: "/courses?view=saved" },
    ],
  },
];

/**
 * Site footer: logo, tagline, link columns, and copyright over the soft silver bars.
 * The year is fixed: `new Date()` here would break static prerendering (cacheComponents).
 */
export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-ink/6">
      <FooterBars className="absolute inset-x-0 bottom-0 -z-10 h-48" />

      <div className="mx-auto w-full max-w-7xl px-6 pt-14 pb-10 sm:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Link href="/" aria-label="Roam home">
              <Logo className="text-heading-2" />
            </Link>
            <p className="mt-3 text-body leading-6 text-muted">
              Search your learning in plain English. Jump straight to the moment a topic is taught.
            </p>
          </div>

          <nav aria-label="Footer" className="flex gap-16">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-small font-semibold tracking-widest text-subtle uppercase">{column.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-body text-muted transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink/6 pt-6 text-small text-subtle sm:flex-row sm:justify-between">
          {/* Update the year here each January */}
          <p>© 2026 Roam. All rights reserved.</p>
          <p>Built with Next.js &amp; Sanity</p>
        </div>
      </div>
    </footer>
  );
}
