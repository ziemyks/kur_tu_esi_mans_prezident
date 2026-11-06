import type { CSSProperties } from "react";
import "./ads.css";

// TODO: replace with real ad network / partner link
const AD_HREF = "#";

// Deterministic flake layout (no randomness -> no hydration mismatch).
const FLAKES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 8 + ((i * 7) % 10),
  duration: 7 + ((i * 3) % 7),
  delay: -((i * 1.3) % 9),
  restTop: (i * 23) % 90,
}));

export function TireTread({ className = "" }: { className?: string }) {
  const lugs = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id="wta-rubber" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#0b0b0f" />
        </radialGradient>
        <linearGradient id="wta-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <g className="ad-tire-spin">
        <circle cx="100" cy="100" r="96" fill="url(#wta-rubber)" />
        {/* tread lugs */}
        {lugs.map((deg) => (
          <g key={deg} transform={`rotate(${deg} 100 100)`}>
            <path d="M92 6 L108 6 L104 22 L96 22 Z" fill="#18181b" />
            <path d="M97 9 L103 9" stroke="#52525b" strokeWidth="1" />
          </g>
        ))}
        {/* siping zigzags */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#27272a"
          strokeWidth="6"
          strokeDasharray="4 3"
        />
        <circle cx="100" cy="100" r="62" fill="#18181b" />
        <circle cx="100" cy="100" r="54" fill="url(#wta-rim)" />
        {Array.from({ length: 5 }, (_, i) => (
          <path
            key={i}
            transform={`rotate(${i * 72} 100 100)`}
            d="M94 100 L97 52 L103 52 L106 100 Z"
            fill="#94a3b8"
            opacity="0.85"
          />
        ))}
        <circle cx="100" cy="100" r="14" fill="#cbd5e1" />
        <circle cx="100" cy="100" r="5" fill="#475569" />
      </g>
      {/* snowflake badge */}
      <g transform="translate(150 150)">
        <circle r="22" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="3" />
        {[0, 60, 120].map((d) => (
          <line
            key={d}
            x1="-12"
            y1="0"
            x2="12"
            y2="0"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${d})`}
          />
        ))}
      </g>
    </svg>
  );
}

export default function WinterTireAd() {
  return (
    <section
      aria-label="Reklāma"
      className="relative isolate overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-950 via-sky-800 to-cyan-600 text-white shadow-[0_0_60px_-20px_rgba(56,189,248,0.6)]"
    >
      <div className="ad-snow-layer" aria-hidden>
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="ad-snowflake"
            style={
              {
                left: `${f.left}%`,
                fontSize: `${f.size}px`,
                animationDuration: `${f.duration}s`,
                animationDelay: `${f.delay}s`,
                "--ad-rest-top": `${f.restTop}%`,
              } as CSSProperties
            }
          >
            ❄
          </span>
        ))}
      </div>

      <span className="absolute left-4 top-3 z-10 rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-sky-100 ring-1 ring-white/20">
        Reklāma
      </span>

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 pb-8 pt-12 sm:flex-row sm:px-10 sm:py-10">
        <TireTread className="h-36 w-36 shrink-0 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] sm:h-44 sm:w-44" />

        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-200">
            RiepuPunkts
          </p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
            Ziemas riepas jau tagad — sagaidi sniegu droši!
          </h2>
          <p className="mt-2 max-w-xl text-sm text-sky-100/90">
            Atgādinām: Latvijā ziemas riepas ir obligātas no{" "}
            <strong className="text-white">1. decembra līdz 1. martam</strong>.
            Plašs izmēru klāsts, montāža un balansēšana uz vietas.
          </p>
          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <p className="text-lg">
              <span className="text-sky-200">no </span>
              <span className="text-3xl font-black text-white">49 €</span>
              <span className="text-sky-200"> / gab.</span>
            </p>
            <a
              href={AD_HREF}
              rel="sponsored noopener"
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-sky-900 shadow-lg transition hover:bg-sky-50 hover:shadow-sky-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-800"
            >
              Skatīt piedāvājumu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
