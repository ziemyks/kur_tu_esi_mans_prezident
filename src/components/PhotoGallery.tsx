"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/types";

type Props = {
  photos: Photo[];
};

function formatDateLv(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("lv-LV", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PhotoGallery({ photos }: Props) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      [...photos]
        .filter((p) => !failed.has(p.id))
        .sort(
          (a, b) =>
            (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0),
        ),
    [photos, failed],
  );

  const openIndex = openId ? visible.findIndex((p) => p.id === openId) : -1;
  const current = openIndex >= 0 ? visible[openIndex] : null;

  const markFailed = useCallback((id: string) => {
    setFailed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const close = useCallback(() => setOpenId(null), []);

  const step = useCallback(
    (delta: number) => {
      if (openIndex < 0 || visible.length === 0) return;
      const next = (openIndex + delta + visible.length) % visible.length;
      setOpenId(visible[next].id);
    },
    [openIndex, visible],
  );

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [current, close, step]);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Pagaidām nav publicētu fotogrāfiju.
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
              aria-label={`Atvērt foto: ${p.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => markFailed(p.id)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <p className="line-clamp-2 text-sm font-semibold text-white">
                  {p.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-300">
                  <span className="text-[#ffb347]">{p.source}</span>
                  {" · "}
                  {formatDateLv(p.publishedAt)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative flex max-h-full w-full max-w-5xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Aizvērt"
              className="absolute -top-2 right-0 z-10 -translate-y-full rounded-full p-2 text-2xl leading-none text-zinc-300 hover:text-white"
            >
              ×
            </button>

            <div className="relative overflow-hidden rounded-xl bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.url}
                alt={current.title}
                referrerPolicy="no-referrer"
                onError={() => {
                  markFailed(current.id);
                  close();
                }}
                className="mx-auto max-h-[75vh] w-auto object-contain"
              />
              {visible.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Iepriekšējais"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white hover:bg-[#ff6a00]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Nākamais"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl text-white hover:bg-[#ff6a00]"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100">{current.title}</p>
                <p className="text-sm text-zinc-400">
                  <span className="text-[#ffb347]">{current.source}</span>
                  {" · "}
                  {formatDateLv(current.publishedAt)}
                  {visible.length > 1 && (
                    <span className="ml-2 text-zinc-500">
                      {openIndex + 1} / {visible.length}
                    </span>
                  )}
                </p>
              </div>
              <a
                href={current.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-gradient-to-r from-[#ff6a00] to-[#ffb347] px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
              >
                Atvērt avotā ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
