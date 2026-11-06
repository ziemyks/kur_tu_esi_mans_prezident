import type { Activity } from "@/lib/types";

type Props = {
  activities: Activity[];
};

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Relative time in Latvian: "tikko", "pirms 5 min", "pirms 2 h", "vakar", else lv-LV date. */
export function formatRelativeLv(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = now.getTime() - date.getTime();

  if (diff >= 0 && diff < MINUTE) return "tikko";
  if (diff >= 0 && diff < HOUR) return `pirms ${Math.floor(diff / MINUTE)} min`;
  if (diff >= 0 && diff < 24 * HOUR) return `pirms ${Math.floor(diff / HOUR)} h`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (startOfDay(date) === startOfDay(yesterday)) return "vakar";

  return date.toLocaleDateString("lv-LV", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatAbsoluteLv(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("lv-LV", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sortNewestFirst(items: Activity[]): Activity[] {
  return [...items].sort(
    (a, b) =>
      (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0),
  );
}

export default function ActivityFeed({ activities }: Props) {
  const items = sortNewestFirst(activities);
  const now = new Date();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Pagaidām nav atrasta neviena publiska aktivitāte. Mēģini vēlāk vēlreiz.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-zinc-800 pl-6">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span
            aria-hidden
            className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-gradient-to-br from-[#ff6a00] to-[#ffb347] ring-4 ring-[#0b0b0f]"
          />
          <article className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-[#ff6a00]/50">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                <time
                  dateTime={a.publishedAt}
                  title={formatAbsoluteLv(a.publishedAt)}
                  className="font-medium text-[#ffb347]"
                >
                  {formatRelativeLv(a.publishedAt, now)}
                </time>
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-medium text-zinc-300">
                  {a.source}
                </span>
              </div>
              <h3 className="text-base font-semibold leading-snug text-zinc-100">
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#ffb347] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00] rounded-sm"
                >
                  {a.title}
                </a>
              </h3>
              {a.summary && (
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">
                  {a.summary}
                </p>
              )}
              {a.geo && (
                <span
                  className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#ff6a00]/10 px-2.5 py-1 text-xs font-medium text-[#ffb347] ring-1 ring-inset ring-[#ff6a00]/30"
                  title={`Atpazīts pēc: ${a.geo.matchedText}`}
                >
                  <span aria-hidden>📍</span>
                  {a.geo.name}
                </span>
              )}
            </div>
            {a.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-16 w-24 shrink-0 self-start rounded-lg bg-zinc-800 object-cover"
              />
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
