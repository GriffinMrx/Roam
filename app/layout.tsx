import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeSync } from "@/lib/theme";
import { THEME_SCRIPT } from "@/lib/theme-shared";
import { SanityLive } from "@/sanity/lib/live";
import "./globals.css";

// Variable font: one file covers every weight the type scale uses (400–700).
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roam",
  description:
    "A unified learning platform. Clean, modern and focused on clarity, consistency and intuitive learning experiences.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is dark on the server; the head script switches it before paint, hence the warning opt-out.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Clerk's own components follow the theme tokens in globals.css (both themes) */}
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "var(--color-surface)",
              colorInput: "var(--color-neutral-50)",
              colorInputForeground: "var(--color-neutral-900)",
              colorForeground: "var(--color-neutral-900)",
              colorMutedForeground: "var(--color-neutral-700)",
              colorNeutral: "var(--color-neutral-900)",
              colorBorder: "var(--color-neutral-200)",
              colorPrimary: "var(--color-primary-500)",
              colorPrimaryForeground: "#ffffff",
              // Also colors the "Development mode" label, which defaults to orange
              colorWarning: "var(--color-primary-500)",
              fontFamily: "var(--font-plus-jakarta-sans)",
            },
          }}
        >
          {children}
          <SanityLive includeDrafts={false} />
          <ThemeSync />
        </ClerkProvider>
      </body>
    </html>
  );
}