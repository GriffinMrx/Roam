import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Poppins is not a variable font: load the weights the type scale uses.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${poppins.variable} h-full antialiased`}
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
              fontFamily: "var(--font-poppins)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}