// Shared data contract. All modules import from here.

export type NewsItem = {
  id: string;            // stable hash of link
  title: string;
  link: string;
  source: string;        // e.g. "LSM", "Delfi", "Google News"
  publishedAt: string;   // ISO 8601
  summary?: string;      // plain text, no HTML, <= 300 chars
  imageUrl?: string;     // absolute https URL if found
};

export type GeoGuess = {
  name: string;          // human place name in Latvian, e.g. "Rīga, Saeima"
  lat: number;
  lng: number;
  confidence: number;    // 0..1
  matchedText: string;   // keyword that triggered the match
};

export type Activity = NewsItem & {
  geo?: GeoGuess;
};

export type Photo = {
  id: string;
  url: string;           // image URL
  title: string;
  link: string;          // page where it was published
  source: string;
  publishedAt: string;   // ISO
};

export type FeedResponse = {
  updatedAt: string;               // ISO
  personName: string;
  activities: Activity[];          // newest first
  photos: Photo[];                 // newest first
  lastKnown?: Activity & { geo: GeoGuess }; // newest activity that has geo
};
