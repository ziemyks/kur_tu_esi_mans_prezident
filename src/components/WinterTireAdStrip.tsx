"use client";

import { useState } from "react";
import "./ads.css";

// TODO: replace with real ad network / partner link
const AD_HREF = "#";

type Props = {
  /** Set to true to render as a fixed (sticky) footer bar. Default: false. */
  sticky?: boolean;
  className?: string;
};

/** Slim one-line winter-tire ad strip with a close button (dismissible). */
export default function WinterTireAdStrip({ sticky = false, className = "" }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <aside
      aria-label="Reklāma"
      className={`${
        sticky ? "fixed inset-x-0 bottom-0 z-40" : "relative"
      } overflow-hidden border-t border-sky-300/30 bg-gradient-to-r from-sky-950 via-sky-800 to-cyan-700 text-white shadow-[0_-8px_30px_-10px_rgba(56,189,248,0.5)] ${className}`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sky-100 ring-1 ring-white/20">
          Reklāma
        </span>
        <span aria-hidden className="shrink-0 text-base">
          ❄
        </span>
        <p className="min-w-0 flex-1 truncate">
          <strong className="font-semibold">RiepuPunkts:</strong> ziemas riepas
          no <strong className="font-bold">49 € / gab.</strong>
          <span className="hidden text-sky-200 sm:inline">
            {" "}
            — obligātas no 1. decembra līdz 1. martam
          </span>
        </p>
        <a
          href={AD_HREF}
          rel="sponsored noopener"
          className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-bold text-sky-900 hover:bg-sky-50"
        >
          Skatīt piedāvājumu
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Aizvērt reklāmu"
          className="shrink-0 rounded-full p-1 text-lg leading-none text-sky-100 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
