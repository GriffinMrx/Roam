/** 4410 → "1h 13m", 2700 → "45m". Durations are stored in seconds. */
export function formatDuration(seconds: number | null | undefined) {
  const total = Math.round((seconds ?? 0) / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 18240 → "18.2k", 950 → "950". */
export function formatCount(value: number | null | undefined) {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : Number(k.toFixed(1))}k`;
}

/** "intermediate" → "Intermediate". */
export function formatLevel(level: string | null | undefined) {
  return level ? level.charAt(0).toUpperCase() + level.slice(1) : "";
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
