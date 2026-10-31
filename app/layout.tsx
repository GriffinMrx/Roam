import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
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
    <html
      lang="en"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Clerk's own components follow the dark tokens in globals.css */}
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "#070709",
              colorInput: "#0c0c0e",
              colorInputForeground: "#fafafa",
              colorForeground: "#fafafa",
              colorMutedForeground: "#a1a1aa",
              colorNeutral: "#fafafa",
              colorBorder: "#1c1c1f",
              colorPrimary: "#a855f7",
              colorPrimaryForeground: "#ffffff",
              // Also colors the "Development mode" label, which defaults to orange
              colorWarning: "#a855f7",
              fontFamily: "var(--font-plus-jakarta-sans)",
            },
          }}
        >
          {children}
          <SanityLive includeDrafts={false} />
        </ClerkProvider>
      </body>
    </html>
  );
}