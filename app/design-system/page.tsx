import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Badge,
  Breadcrumbs,
  Button,
  CourseCard,
  Icon,
  iconNames,
  type IconName,
  LessonCard,
  Logo,
  Navbar,
  Pagination,
  ProgressBar,
  ResourceCard,
  SearchInput,
  Select,
  Status,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Design System · Roam",
};

/* ---------- Reference data ---------- */

const primary = [
  ["Primary 500", "#A855F7", "bg-primary-500"],
  ["Primary 400", "#C084FC", "bg-primary-400"],
  ["Primary 300", "#6D3FA6", "bg-primary-300"],
  ["Primary 200", "#3B1F5C", "bg-primary-200"],
  ["Primary 100", "#221433", "bg-primary-100"],
];

const neutral = [
  ["Neutral 950", "#000000", "bg-neutral-950"],
  ["Neutral 900", "#FAFAFA", "bg-neutral-900"],
  ["Neutral 700", "#A1A1AA", "bg-neutral-700"],
  ["Neutral 500", "#71717A", "bg-neutral-500"],
  ["Neutral 300", "#2A2A2D", "bg-neutral-300"],
  ["Neutral 200", "#1C1C1F", "bg-neutral-200"],
  ["Neutral 100", "#161618", "bg-neutral-100"],
  ["Neutral 50", "#0C0C0E", "bg-neutral-50"],
  ["Surface", "#070709", "bg-surface"],
  ["White", "#FFFFFF", "bg-white"],
];

const typeScale = [
  ["Display 1", "Plus Jakarta Sans", "48 / 56", "Bold", "Page titles", "font-display text-display-1"],
  ["Display 2", "Plus Jakarta Sans", "36 / 44", "Bold", "Section titles", "font-display text-display-2"],
  ["Heading 1", "Plus Jakarta Sans", "28 / 36", "Semi Bold", "Card titles", "text-heading-1"],
  ["Heading 2", "Plus Jakarta Sans", "22 / 30", "Semi Bold", "Sub section", "text-heading-2"],
  ["Heading 3", "Plus Jakarta Sans", "18 / 26", "Medium", "Small titles", "text-heading-3"],
  ["Body Large", "Plus Jakarta Sans", "16 / 24", "Regular", "Body copy", "text-body-lg"],
  ["Body", "Plus Jakarta Sans", "14 / 20", "Regular", "Supporting text", "text-body"],
  ["Small", "Plus Jakarta Sans", "12 / 16", "Regular", "Captions, meta", "text-small"],
];

const spacing = [
  [4, "0.25rem", "size-1"],
  [8, "0.5rem", "size-2"],
  [12, "0.75rem", "size-3"],
  [16, "1rem", "size-4"],
  [24, "1.5rem", "size-6"],
  [32, "2rem", "size-8"],
  [40, "2.5rem", "size-10"],
  [48, "3rem", "size-12"],
  [64, "4rem", "size-16"],
] as const;

const radii = [
  ["4px", "xs", "rounded-xs"],
  ["8px", "sm", "rounded-sm"],
  ["12px", "md", "rounded-md"],
  ["16px", "lg", "rounded-lg"],
  ["24px", "xl", "rounded-xl"],
  ["Full", "circle", "rounded-full"],
];

const shadows = [
  ["Sm", "0 1px 2px 0", "rgba(0, 0, 0, 0.3)", "shadow-sm"],
  ["Md", "0 4px 12px -2px", "rgba(0, 0, 0, 0.4)", "shadow-md"],
  ["Lg", "0 12px 24px -4px", "rgba(0, 0, 0, 0.45)", "shadow-lg"],
  ["Xl", "0 20px 40px -8px", "rgba(0, 0, 0, 0.5)", "shadow-xl"],
];

const principles: [IconName, string, string][] = [
  ["eye", "Clarity First", "Every element should communicate clearly."],
  ["categories", "Consistency", "Use components and patterns consistently across the platform."],
  ["discover", "Focus & Calm", "Remove noise and help learners focus on what matters."],
  ["wheel-chair", "Accessible", "Design with accessibility and inclusivity in mind."],
];

/* ---------- Layout helpers ---------- */

function Section({
  index,
  title,
  className,
  children,
}: {
  index: number;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section
      aria-labelledby={id}
      className={cn("rounded-lg border border-border bg-surface p-6", className)}
    >
      <h2
        id={id}
        className="mb-6 flex items-center gap-4 text-small font-semibold tracking-widest text-foreground uppercase"
      >
        <span className="text-primary-500 tabular-nums">{String(index).padStart(2, "0")}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-body font-medium text-foreground">{children}</h3>;
}

function Swatch({ name, hex, bg }: { name: string; hex: string; bg: string }) {
  return (
    <div className="w-24">
      <div className={cn("h-12 rounded-sm border border-border", bg)} />
      <p className="mt-2 text-small text-muted">{name}</p>
      <p className="text-small text-subtle">{hex}</p>
    </div>
  );
}

function Specs({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4 text-small text-muted marker:text-subtle">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/* ---------- Page ---------- */

export default function DesignSystemPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 p-4 sm:p-8 lg:grid-cols-12">
      {/* Intro */}
      <header className="flex flex-col rounded-lg border border-border bg-surface p-8 lg:col-span-4">
        <Logo className="text-heading-2" />
        <h1 className="mt-6 font-display text-display-1">Design System</h1>
        <p className="mt-4 text-body-lg text-muted">
          A unified design language for Roam learning platform. Clean, modern and focused on
          clarity, consistency and intuitive learning experiences.
        </p>
        <p className="mt-auto pt-8 text-small tracking-wider text-muted uppercase">
          Version 1.0 <span aria-hidden>·</span> May 2025
        </p>
      </header>

      <Section index={1} title="Colors" className="lg:col-span-8">
        <Label>Primary</Label>
        <div className="flex flex-wrap gap-4">
          {primary.map(([name, hex, bg]) => (
            <Swatch key={name} name={name} hex={hex} bg={bg} />
          ))}
        </div>
        <div className="mt-8">
          <Label>Neutral</Label>
          <div className="flex flex-wrap gap-4">
            {neutral.map(([name, hex, bg]) => (
              <Swatch key={name} name={name} hex={hex} bg={bg} />
            ))}
          </div>
        </div>
      </Section>

      <Section index={2} title="Typography" className="lg:col-span-5">
        <div className="flex items-center gap-8">
          <span className="w-24 text-[4rem] leading-none font-semibold">Ag</span>
          <div>
            <p className="text-heading-2">Plus Jakarta Sans</p>
            <p className="mt-2 text-body text-subtle">
              {["Geometric", "Friendly", "Highly legible"].map((trait, i) => (
                <span key={trait}>
                  {i > 0 && <span className="mx-2 text-primary-500">•</span>}
                  {trait}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-4 border-t border-border pt-6">
          {(
            [
              ["Regular", "400", "font-normal"],
              ["Medium", "500", "font-medium"],
              ["Semi Bold", "600", "font-semibold"],
              ["Bold", "700", "font-bold"],
            ] as const
          ).map(([label, weight, cls]) => (
            <div key={weight}>
              <p className={cn(cls, "text-heading-1")}>Aa</p>
              <p className="mt-1 text-small text-muted">{label}</p>
              <p className="text-small text-subtle">{weight}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section index={3} title="Type Scale" className="overflow-x-auto lg:col-span-7">
        <table className="w-full text-left text-small">
          <thead className="text-muted">
            <tr>
              {["Style", "Font", "Size / Line Height", "Weight", "Use"].map((h) => (
                <th key={h} className="pb-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-subtle">
            {typeScale.map(([style, font, size, weight, use]) => (
              <tr key={style}>
                <td className="py-1 pr-4 text-body text-foreground">{style}</td>
                <td>{font}</td>
                <td className="tabular-nums">{size}</td>
                <td>{weight}</td>
                <td>{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section index={4} title="Spacing System" className="lg:col-span-6">
        <Label>Base unit: 4px</Label>
        <div className="grid grid-cols-9 items-end gap-1">
          {spacing.map(([px, rem, size]) => (
            <div key={px} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-16 items-end">
                <div className={cn(size, "rounded-xs bg-primary-200")} />
              </div>
              <p className="text-small text-foreground">{px}</p>
              <p className="text-small text-subtle">({rem})</p>
            </div>
          ))}
        </div>
      </Section>

      <Section index={5} title="Radius & Shadows" className="lg:col-span-6">
        <Label>Radius</Label>
        <div className="flex flex-wrap gap-6">
          {radii.map(([value, name, cls]) => (
            <div key={name} className="flex flex-col items-center gap-2 text-center">
              <div className={cn(cls, "size-12 border border-border bg-surface")} />
              <p className="text-small text-muted">{value}</p>
              <p className="text-small text-subtle">({name})</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Label>Shadows</Label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {shadows.map(([name, offset, color, cls]) => (
              <div key={name} className={cn(cls, "rounded-md bg-surface p-3")}>
                <p className="text-body font-medium">{name}</p>
                <p className="mt-2 text-small text-subtle">{offset}</p>
                <p className="text-small text-subtle">{color}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section index={6} title="Icons" className="lg:col-span-3">
        <div className="mb-6">
          <Label>Twotone Style</Label>
          <div className="flex flex-wrap gap-4 text-foreground">
            {iconNames.map((name) => (
              <Icon key={name} name={name} size={20} label={name} />
            ))}
          </div>
        </div>
        <Label>Icon Specs</Label>
        <Specs
          items={[
            "Haicon v2.0 · Twotone",
            "24×24px grid",
            "1.5px stroke width",
            "Rounded line caps",
            "Secondary tone at 40% opacity",
          ]}
        />
      </Section>

      <Section index={7} title="Buttons" className="overflow-x-auto lg:col-span-9">
        <div className="grid min-w-max grid-cols-[auto_repeat(4,auto)] items-center justify-start gap-x-4 gap-y-3 text-small">
          <span />
          {["Primary", "Secondary", "Tertiary", "Text"].map((h) => (
            <span key={h} className="text-muted">
              {h}
            </span>
          ))}
          {(["Default", "Hover", "Disabled"] as const).map((state) => {
            const stateProps = {
              size: "md" as const,
              disabled: state === "Disabled",
              "data-hover": state === "Hover" || undefined,
            };
            return [
              <span key={state} className="text-muted">
                {state}
              </span>,
              <Button key={`${state}-p`} {...stateProps}>
                Get Started
              </Button>,
              <Button key={`${state}-s`} variant="secondary" {...stateProps}>
                Explore Courses
              </Button>,
              <Button key={`${state}-t`} variant="tertiary" icon="link-external" {...stateProps}>
                View Lesson
              </Button>,
              <Button key={`${state}-x`} variant="text" icon="play-circle" {...stateProps}>
                Watch Video
              </Button>,
            ];
          })}
        </div>
        <div className="mt-6">
          <Label>Button Specs</Label>
          <Specs
            items={[
              "Height: 44px (default)",
              "Padding: 0 16px (lg), 0 12px (md)",
              "Radius: 12px",
              "Font: Plus Jakarta Sans Medium (14–16px)",
            ]}
          />
        </div>
      </Section>

      <Section index={8} title="Inputs" className="lg:col-span-3">
        <Label>Search / Text Input</Label>
        <SearchInput aria-label="Search" />
        <div className="mt-6">
          <Label>Select</Label>
          <Select aria-label="Sort by" defaultValue="relevant">
            <option value="relevant">Most Relevant</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
          </Select>
        </div>
        <div className="mt-6">
          <Label>Field Specs</Label>
          <Specs
            items={[
              "Height: 44px",
              "Radius: 12px",
              "Border: 1px solid #1C1C1F",
              "Padding: 0 16px",
              "Focus: Border color #C084FC",
            ]}
          />
        </div>
      </Section>

      <Section index={9} title="Badges / Tags" className="lg:col-span-3">
        <div className="flex flex-wrap gap-6">
          {(
            [
              ["Video", "video"],
              ["Lesson", "lesson"],
              ["Popular", "popular"],
            ] as const
          ).map(([label, variant]) => (
            <div key={variant}>
              <p className="mb-2 text-small text-muted">{label}</p>
              <Badge variant={variant}>{label}</Badge>
            </div>
          ))}
        </div>
      </Section>

      <Section index={10} title="Status / Indicators" className="lg:col-span-3">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Status status="in-progress" />
          <Status status="completed" />
          <Status status="now-playing" />
          <Status status="locked" />
        </div>
      </Section>

      <Section index={11} title="Progress Bar" className="lg:col-span-3">
        <ProgressBar value={35} />
      </Section>

      <Section index={12} title="Cards" className="lg:col-span-12">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col">
            <Label>Course Card</Label>
            <CourseCard
              className="flex-1"
              title="Next.js for Production"
              description="Build scalable, high-performance web applications with Next.js."
              level="Intermediate"
              duration="18h 24m"
              modules={12}
            />
          </div>
          <div className="flex flex-col">
            <Label>Lesson Card (Video)</Label>
            <LessonCard
              className="flex-1"
              type="video"
              title="Data Fetching in Server Components"
              description="Learn how to fetch data on the server using async/await and Next.js best practices."
              meta="Lesson 5.1 · 12:45"
              resumeAt="12:45"
              href="#"
            />
          </div>
          <div className="flex flex-col">
            <Label>Lesson Card (Lesson)</Label>
            <LessonCard
              className="flex-1"
              type="lesson"
              title="Data Fetching & Caching"
              description="Explore different data fetching methods in Next.js and how to cache and revalidate data for optimal performance."
              meta="Module 5"
              href="#"
            />
          </div>
          <div className="flex flex-col">
            <Label>Resource Card</Label>
            <ResourceCard
              className="flex-1"
              title="Caching and Revalidation Guide"
              description="Deep dive into Next.js caching strategies."
              format="PDF"
              size="1.2 MB"
              href="#"
            />
          </div>
        </div>
      </Section>

      <Section index={13} title="Navigation" className="lg:col-span-12">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Navbar
            items={[
              { label: "Courses", href: "/design-system", active: true },
              { label: "My Learning", href: "#" },
            ]}
          />
          <div>
            <p className="mb-2 text-small text-muted">Breadcrumbs</p>
            <Breadcrumbs
              items={[
                { label: "All Courses", href: "#" },
                { label: "Next.js for Production", href: "#" },
                { label: "Data Fetching & Caching" },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-small text-muted">Pagination</p>
            <Pagination page={1} totalPages={8} hrefFor={(p) => `#page-${p}`} />
          </div>
        </div>
      </Section>

      <Section index={14} title="Principles" className="lg:col-span-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(([icon, title, body]) => (
            <div key={title} className="flex gap-4">
              <Icon name={icon} size={32} className="shrink-0 text-muted" />
              <div>
                <h3 className="text-body font-medium">{title}</h3>
                <p className="mt-1 text-small text-subtle">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
