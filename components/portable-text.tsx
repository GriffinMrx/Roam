import {
  PortableText as BasePortableText,
  type PortableTextComponents,
  type PortableTextProps,
} from "@portabletext/react";

/** Only http(s) and mailto links are rendered as links; anything else renders as text. */
function safeHref(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  return /^(https?:|mailto:)/i.test(href) ? href : undefined;
}

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="text-body-lg leading-7 text-muted">{children}</p>,
    h2: ({ children }) => <h3 className="pt-2 text-heading-3 text-foreground">{children}</h3>,
    h3: ({ children }) => <h4 className="pt-1 text-body-lg font-semibold text-foreground">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary-400 pl-4 text-body-lg text-muted italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc space-y-2 pl-5 text-body-lg leading-7 text-muted marker:text-primary-500">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal space-y-2 pl-5 text-body-lg leading-7 text-muted marker:text-primary-500">
        {children}
      </ol>
    ),
  },
  marks: {
    code: ({ children }) => (
      <code className="rounded-xs bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      const href = safeHref(value?.href);
      if (!href) return <>{children}</>;
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary-500 underline underline-offset-2 transition-colors hover:text-primary-400"
        >
          {children}
        </a>
      );
    },
  },
};

/** Rich text (lesson notes, instructor bios) styled for the dark theme. */
export function PortableText({ value }: { value: PortableTextProps["value"] }) {
  return (
    <div className="space-y-4">
      <BasePortableText value={value} components={components} />
    </div>
  );
}
