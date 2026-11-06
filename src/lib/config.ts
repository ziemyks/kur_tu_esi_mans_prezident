// Who we track and where we read public news from.
// Edit these when the government changes — nothing else needs to change.

export const PERSON = {
  displayName: "Andris Kulbergs",
  role: "Ministru prezidents",
  // Regex stems used to keep only relevant items (diacritic variants included).
  // Used on general news feeds — name only, so other countries' premiers don't slip in.
  match: [/k[uū]lberg/i],
};

export type FeedSource = { name: string; url: string; filter: boolean };

const gnews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=lv&gl=LV&ceid=LV:lv`;

export const FEEDS: FeedSource[] = [
  // Publisher feeds carry images (enclosure) — keep only items naming the PM.
  { name: "LSM", url: "https://www.lsm.lv/rss/", filter: true },
  { name: "Delfi", url: "https://www.delfi.lv/rss/index.xml", filter: true },
  { name: "TVNET", url: "https://www.tvnet.lv/rss", filter: true },
  { name: "Apollo", url: "https://www.apollo.lv/rss", filter: true },
  // Google News already filters by query (no images, but wide coverage).
  { name: "Google News", url: gnews("Kulbergs when:14d"), filter: false },
];

// Official Cabinet news list (no RSS exists, so it's scraped). Category 146 = "Ministru prezidents".
export const MK_NEWS_URLS = [
  "https://www.mk.gov.lv/lv/jaunumi?category%5B146%5D=146",
  "https://www.mk.gov.lv/lv/jaunumi",
];

// Photo-only feeds. Valsts kanceleja Flickr — may be flaky, failures are ignored.
export const PHOTO_FEEDS: FeedSource[] = [
  {
    name: "Valsts kanceleja (Flickr)",
    url: "https://www.flickr.com/services/feeds/photos_public.gne?id=34132284@N06&lang=en-us&format=rss2",
    filter: false,
  },
];

// Fallback portrait (Wikimedia Commons, CC BY 4.0, Stenbocki maja).
export const PORTRAIT = {
  url: "https://upload.wikimedia.org/wikipedia/commons/4/43/Andris_Kulbergs_%282026%29.jpg",
  credit: "Stenbocki maja / Wikimedia Commons, CC BY 4.0",
  link: "https://commons.wikimedia.org/wiki/File:Andris_Kulbergs_(2026).jpg",
};

export const REVALIDATE_SECONDS = 600; // 10 min
