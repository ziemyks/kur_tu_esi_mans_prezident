import { XMLParser } from "fast-xml-parser";
import { FEEDS, MK_NEWS_URLS, PERSON, PHOTO_FEEDS, REVALIDATE_SECONDS, type FeedSource } from "./config";
import { guessLocation } from "./geo";
import type { Activity, FeedResponse, GeoGuess, NewsItem, Photo } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
});

const UA = "Mozilla/5.0 (compatible; KurTuEsiBot/1.0)";

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const stripHtml = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>))
    return text((v as Record<string, unknown>)["#text"]);
  return "";
}

function attr(v: unknown, name: string): string | undefined {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  for (const x of arr) {
    const val = (x as Record<string, unknown>)?.[`@${name}`];
    if (typeof val === "string" && val) return val;
  }
  return undefined;
}

function findImage(item: Record<string, unknown>, rawDesc: string): string | undefined {
  const fromMedia =
    attr(item["media:content"], "url") ??
    attr(item["media:thumbnail"], "url") ??
    attr((item["media:group"] as Record<string, unknown>)?.["media:content"], "url");
  if (fromMedia) return fromMedia;
  const enc = item["enclosure"];
  const encUrl = attr(enc, "url");
  const encType = attr(enc, "type");
  if (encUrl && (!encType || encType.startsWith("image"))) return encUrl;
  const m = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function sourceName(item: Record<string, unknown>, feed: FeedSource, title: string): string {
  const src = text(item["source"]);
  if (src) return src;
  // Google News titles end with " - Publisher"
  const m = title.match(/\s[-–]\s([^-–]+)$/);
  if (feed.name === "Google News" && m) return m[1].trim();
  return feed.name;
}

async function fetchFeed(feed: FeedSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = parser.parse(await res.text());
    const channel = xml?.rss?.channel ?? xml?.feed;
    const raw = channel?.item ?? channel?.entry ?? [];
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];

    return items.flatMap((it) => {
      let title = stripHtml(text(it.title));
      const link = text(it.link) || attr(it.link, "href") || "";
      if (!title || !link) return [];
      const source = sourceName(it, feed, title);
      if (feed.name === "Google News") title = title.replace(/\s[-–]\s[^-–]+$/, "");
      const rawDesc = text(it.description) || text(it.summary) || text(it["content:encoded"]);
      let summary = stripHtml(rawDesc);
      // Google News descriptions just repeat the title + publisher.
      if (summary.startsWith(title.slice(0, 30))) summary = "";
      const date = new Date(text(it.pubDate) || text(it.published) || text(it.updated) || Date.now());
      return [
        {
          id: hash(link),
          title,
          link,
          source,
          publishedAt: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
          summary: summary ? summary.slice(0, 300) : undefined,
          imageUrl: findImage(it, rawDesc),
        } satisfies NewsItem,
      ];
    }).filter((n) => !feed.filter || PERSON.match.some((re) => re.test(`${n.title} ${n.summary ?? ""}`)));
  } catch {
    return [];
  }
}

/** Scrape the official mk.gov.lv news list (there is no RSS). */
async function fetchMk(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const base = "https://www.mk.gov.lv";
    return html.split('class="views-row"').slice(1).flatMap((card) => {
      const t = card.match(/<h2><a href="(\/lv\/jaunums\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
      if (!t) return [];
      const title = stripHtml(t[2]);
      const summary = stripHtml(card.match(/<div class="text">([\s\S]*?)<\/div>/)?.[1] ?? "");
      const category = stripHtml(card.match(/class="categories">([\s\S]*?)<\/div>/)?.[1] ?? "");
      if (!/ministru prezident/i.test(category) && !PERSON.match.some((re) => re.test(`${title} ${summary}`)))
        return [];
      const img = card.match(/<img[^>]+src="([^"]+)"/)?.[1];
      const date = card.match(/<time datetime="([^"]+)"/)?.[1];
      const link = base + t[1];
      return [
        {
          id: hash(link),
          title,
          link,
          source: "mk.gov.lv",
          publishedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
          summary: summary || undefined,
          imageUrl: img ? new URL(decodeEntities(img), base).toString() : undefined,
        } satisfies NewsItem,
      ];
    });
  } catch {
    return [];
  }
}

/** Try to read og:image from an article page (only for direct, non-redirect links). */
async function ogImage(url: string): Promise<string | undefined> {
  if (/news\.google\.com/.test(url)) return undefined;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    const html = (await res.text()).slice(0, 200_000);
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? decodeEntities(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((n) => {
    const key = n.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").slice(0, 60);
    if (seen.has(key) || seen.has(n.id)) return false;
    seen.add(key);
    seen.add(n.id);
    return true;
  });
}

export async function getFeed(): Promise<FeedResponse> {
  const [newsLists, mkLists, photoLists] = await Promise.all([
    Promise.all(FEEDS.map(fetchFeed)),
    Promise.all(MK_NEWS_URLS.map(fetchMk)),
    Promise.all(PHOTO_FEEDS.map(fetchFeed)),
  ]);

  // Official source first so it wins dedupe.
  const news = dedupe([...mkLists.flat(), ...newsLists.flat()])
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 40);

  // Enrich the newest few image-less items with og:image.
  await Promise.all(
    news
      .filter((n) => !n.imageUrl)
      .slice(0, 8)
      .map(async (n) => {
        n.imageUrl = await ogImage(n.link);
      }),
  );

  const activities: Activity[] = news.map((n) => ({
    ...n,
    geo: guessLocation(`${n.title}. ${n.summary ?? ""}`),
  }));

  const photos: Photo[] = [...photoLists.flat(), ...news]
    .filter((n): n is NewsItem & { imageUrl: string } => !!n.imageUrl)
    .map((n) => ({
      id: n.id,
      url: n.imageUrl,
      title: n.title,
      link: n.link,
      source: n.source,
      publishedAt: n.publishedAt,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 24);

  const lastKnown = activities.find((a): a is Activity & { geo: GeoGuess } => !!a.geo);

  return {
    updatedAt: new Date().toISOString(),
    personName: PERSON.displayName,
    activities,
    photos,
    lastKnown,
  };
}
