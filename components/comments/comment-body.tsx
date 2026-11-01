"use client";

import { Fragment } from "react";
import { SEEK_EVENT, type SeekRequest } from "@/components/video-player";

/*
 * Comment text, rendered as plain text (React escapes it: no HTML or markdown). Times like
 * "3:12" or "1:02:03" become chips that jump the lesson video to that second; if no
 * player handles the jump (Vimeo/Bunny embeds), the chip's ?t= link opens the lesson there.
 */

const TIME = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;

function toSeconds(h: string | undefined, m: string, s: string) {
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
}

export function CommentBody({ text, maxSeconds }: { text: string; maxSeconds?: number }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TIME)) {
    const seconds = toSeconds(match[1], match[2], match[3]);
    if (maxSeconds && seconds > maxSeconds) continue;
    const start = match.index ?? 0;
    parts.push(<Fragment key={`t${last}`}>{text.slice(last, start)}</Fragment>);
    parts.push(
      <a
        key={`c${start}`}
        href={`?t=${seconds}`}
        onClick={(event) => {
          const detail: SeekRequest = { seconds };
          window.dispatchEvent(new CustomEvent(SEEK_EVENT, { detail }));
          if (detail.handled) event.preventDefault();
        }}
        className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 align-baseline text-small font-semibold text-[#e4e4e7] tabular-nums ring-1 ring-white/15 transition-colors ring-inset hover:bg-white/15"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-2.5" fill="currentColor">
          <path d="M7 4.6c0-1.2 1.3-1.9 2.3-1.3l11 7.4c.9.6.9 2 0 2.6l-11 7.4c-1 .7-2.3-.1-2.3-1.3V4.6Z" />
        </svg>
        {match[0]}
      </a>,
    );
    last = start + match[0].length;
  }
  parts.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <p className="text-body leading-6 break-words whitespace-pre-wrap text-[#d4d4d8]">{parts}</p>;
}
