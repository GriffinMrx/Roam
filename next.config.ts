import type { NextConfig } from "next";
import { sanity } from "next-sanity/live/cache-life";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // Sanity results stay cached until a live event invalidates them (sanity/lib/live.ts)
  cacheLife: {
    default: sanity,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      // YouTube video frames, the poster fallback for lessons without a thumbnail
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      // Teacher profile photos are their Clerk avatars (prompts/teachers-phase-1.md)
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  partialPrefetching: true,
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    // Every route (prompts/admin-charts-and-hardening.md): no framing by other sites (clickjacking),
    // no MIME sniffing, no full URLs leaked to other sites, and no camera/mic/location access.
    // Lesson videos are iframes inside our pages, which frame-ancestors doesn't affect.
    const site = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    // Admin console (prompts/admin-console.md): never cached, indexed, framed, or leaked via Referer.
    // Listed after the site rules, so these stricter values win on /admin.
    const admin = [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "Referrer-Policy", value: "same-origin" },
    ];
    return [
      { source: "/:path*", headers: site },
      { source: "/admin", headers: admin },
      { source: "/admin/:path*", headers: admin },
      { source: "/api/admin/:path*", headers: admin },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
