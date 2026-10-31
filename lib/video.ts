/*
 * Video provider helpers for the lesson page. Only strictly-matched IDs are ever
 * put into an embed URL, so arbitrary URLs can't end up in an iframe src.
 * Supported providers (AGENTS §9): YouTube, Vimeo, Bunny Stream.
 */

export type VideoSource =
  | { provider: "youtube"; id: string }
  | { provider: "vimeo"; id: string }
  | { provider: "bunny"; library: string; id: string };

const YOUTUBE_ID = /^[\w-]{11}$/;
const DIGITS = /^\d+$/;
const BUNNY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseVideoUrl(url: string | null | undefined): VideoSource | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : undefined);
    return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "youtu.be") {
    const id = parts[0];
    return id && YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = host === "player.vimeo.com" ? parts[1] : parts[0];
    return id && DIGITS.test(id) ? { provider: "vimeo", id } : null;
  }
  if (host === "iframe.mediadelivery.net" || host === "player.mediadelivery.net") {
    // /embed/<libraryId>/<videoId> or /play/<libraryId>/<videoId>
    const [, library, id] = parts;
    return library && DIGITS.test(library) && id && BUNNY_ID.test(id)
      ? { provider: "bunny", library, id }
      : null;
  }
  return null;
}

/**
 * Embed URL using the provider's own start parameter (whole seconds).
 * `autoplay` is for embeds mounted by a click on the poster.
 */
export function embedUrl(source: VideoSource, start = 0, { autoplay = false } = {}): string {
  const s = Math.max(0, Math.floor(start));
  switch (source.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${source.id}?start=${s}&rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${source.id}${autoplay ? "?autoplay=1" : ""}${s ? `#t=${s}s` : ""}`;
    case "bunny": {
      const params = [s && `t=${s}`, autoplay && "autoplay=true"].filter(Boolean).join("&");
      return `https://iframe.mediadelivery.net/embed/${source.library}/${source.id}${params ? `?${params}` : ""}`;
    }
  }
}

/** YouTube's own frame for the video, used as the poster when a lesson has no thumbnail. */
export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Parses the lesson page's `?t=<seconds>` param; anything invalid means "from the start". */
export function parseStartSeconds(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !DIGITS.test(raw)) return 0;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : 0;
}

/** 4410 → "1:13:30", 75 → "1:15". Player clock format. */
export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
