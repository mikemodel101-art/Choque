/*
 * components/youtube-embed.tsx — privacy-enhanced, lazy YouTube embed.
 * Why: technique videos are central to a grappling notebook, but a raw iframe
 * loads trackers on every page view. This renders the static thumbnail first
 * and only swaps in the player — from youtube-nocookie.com — after an explicit
 * click, so nothing third-party loads until the member asks for it.
 */
"use client";

import { useState } from "react";
import { Play, Trash2, X } from "lucide-react";
import type { NoteLink } from "@/lib/types";
import { cn } from "@/lib/utils";

function secondsToLabel(s?: number) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function YouTubeEmbed({
  link,
  onRemove,
  className,
}: {
  link: NoteLink;
  onRemove?: () => void;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const stamp = secondsToLabel(link.startSeconds);

  const src =
    `https://www.youtube-nocookie.com/embed/${link.youtubeId}` +
    `?autoplay=1&rel=0&modestbranding=1${link.startSeconds ? `&start=${link.startSeconds}` : ""}`;

  return (
    <figure className={cn("overflow-hidden rounded-sm border border-border bg-surface shadow-1", className)}>
      <div className="relative aspect-video bg-black">
        {playing ? (
          <iframe
            src={src}
            title={link.title || "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 size-full cursor-pointer"
            aria-label={`Play ${link.title || "video"}${stamp ? ` from ${stamp}` : ""}`}
          >
            {/* Static thumbnail — no cookies, no third-party JS until play */}
            {/* eslint-disable-next-line @next/next/no-img-element -- plain CDN thumbnail, intentionally unoptimized */}
            <img
              src={`https://i.ytimg.com/vi/${link.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-accent/95 shadow-2 transition-transform group-hover:scale-105">
                <Play className="size-6 translate-x-0.5 fill-white text-white" />
              </span>
            </span>
            {stamp && (
              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[11px] text-white">
                from {stamp}
              </span>
            )}
          </button>
        )}
        {playing && (
          <button
            type="button"
            onClick={() => setPlaying(false)}
            aria-label="Close player"
            className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <figcaption className="flex items-center gap-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-xs">
          {link.title || <span className="text-muted">YouTube · {link.youtubeId}</span>}
        </span>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
        >
          Open
        </a>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove video"
            className="shrink-0 rounded-sm p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </figcaption>
    </figure>
  );
}
