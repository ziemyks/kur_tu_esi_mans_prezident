// Location inference from Latvian (and English) news titles/summaries.
// Pure, dependency-free gazetteer + regex matcher.

import type { GeoGuess } from "./types";

/** Specificity tiers: higher wins over lower regardless of position. */
const TIER = {
  venue: 4, // specific building / site
  city: 3, // Latvian city/town or foreign city
  keyword: 2, // institution/event keyword implying a city (e.g. "Eiropadome")
  country: 1, // country only, with a travel verb ("vizītē Ukrainā")
} as const;

type Tier = (typeof TIER)[keyof typeof TIER];

type Pattern =
  | string
  | {
      re: string;
      /** Don't require the match to start with an uppercase letter. */
      lower?: boolean;
      /** Only use in strict (diacritic-sensitive) mode. */
      strict?: boolean;
    };

type Place = {
  name: string;
  lat: number;
  lng: number;
  confidence: number;
  tier: Tier;
  patterns: Pattern[];
};

// ---------------------------------------------------------------------------
// Latvian declension helpers (case endings for the stem).
// ---------------------------------------------------------------------------

/** 4th declension feminine -a: Rīga, Rīgas, Rīgai, Rīgu, Rīgā. */
const fa = (stem: string) => `${stem}(?:a|as|ai|u|ā)`;
/** 5th declension feminine -e: Brisele, Briseles, Brisele i, Briseli, Briselē. */
const fe = (stem: string) => `${stem}(?:e|es|ei|i|ē)`;
/** -pils towns: Daugavpils, Daugavpilij, Daugavpili, Daugavpilī. */
const pils = (stem: string) => `${stem}pil(?:s|ij|i|ī)`;
/** Plural masculine -i (Talsi, Talsu, Talsiem, Talsus, Talsos). */
const mi = (stem: string) => `${stem}(?:i|u|iem|us|os)`;
/** Plural feminine -as (Pļaviņas, Pļaviņām, Pļaviņās). */
const fpl = (stem: string) => `${stem}(?:as|u|ām|ās)`;
/** Masculine -s (Tukums, Tukuma, Tukumam, Tukumu, Tukumā). */
const ms = (stem: string) => `${stem}(?:s|a|am|u|ā)`;

const L = "\\p{L}*"; // any trailing letters (free inflection)

// ---------------------------------------------------------------------------
// Gazetteer
// ---------------------------------------------------------------------------

const RIGA_VENUE = 0.9;
const CITY = 0.7;

const v = (
  name: string,
  lat: number,
  lng: number,
  patterns: Pattern[],
  confidence = RIGA_VENUE,
): Place => ({ name, lat, lng, confidence, tier: TIER.venue, patterns });

const c = (
  name: string,
  lat: number,
  lng: number,
  patterns: Pattern[],
  confidence = CITY,
): Place => ({ name, lat, lng, confidence, tier: TIER.city, patterns });

const k = (
  name: string,
  lat: number,
  lng: number,
  patterns: Pattern[],
  confidence = 0.6,
): Place => ({ name, lat, lng, confidence, tier: TIER.keyword, patterns });

const TRAVEL =
  "(?:vizīt" + L + "|dodas|devās|dosies|ierad" + L + "|ieradīsies|viesoj" + L +
  "|viesojas|viesosies|uzturas|apmeklē" + L + "|aizbrauc" + L + "|lidos|aizlidoj" + L +
  "|visit" + L + "|trip|arrives?|travels?)\\s+(?:darba\\s+vizītē\\s+)?(?:uz\\s+|to\\s+|in\\s+)?";

const ctry = (
  name: string,
  lat: number,
  lng: number,
  forms: string[],
): Place => ({
  name,
  lat,
  lng,
  confidence: 0.35,
  tier: TIER.country,
  patterns: [{ re: `${TRAVEL}(?:${forms.join("|")})`, lower: true }],
});

const PLACES: Place[] = [
  // ----- Specific Riga venues -----
  v("Rīga, Saeima", 56.951, 24.1066, [fa("Saeim"), "Latvian\\s+Parliament"]),
  v("Rīga, Ministru kabinets", 56.9547, 24.114, [
    `Ministru\\s+kabinet${L}`,
    `Valsts\\s+kancelej${L}`,
    { re: `valdības\\s+(?:sēd${L}|māj${L})`, lower: true },
  ]),
  v("Rīga, Rīgas pils", 56.9512, 24.1005, [
    `Rīgas\\s+pil(?:s|ī|ij|i)`,
    "Riga Castle",
    `Valsts\\s+prezident${L}`,
  ], 0.85),
  v("Rīga, Ārlietu ministrija", 56.9553, 24.11, [`Ārlietu\\s+ministrij${L}`]),
  v("Rīga, Aizsardzības ministrija", 56.9566, 24.1092, [`Aizsardzības\\s+ministrij${L}`]),
  v("Rīga, Brīvības piemineklis", 56.9514, 24.1133, [
    `Brīvības\\s+piemine(?:kl|kļ)${L}`,
    "Freedom Monument",
  ]),
  v("Rīga, Starptautiskā lidosta „Rīga”", 56.9236, 23.9711, [
    `Rīgas\\s+(?:starptautisk${L}\\s+)?lidost${L}`,
    { re: `lidost${L}\\s+[„"“]?Rīga`, lower: true },
    "Riga Airport",
    "Riga International Airport",
  ]),
  v("Ādaži, Ādažu militārā bāze", 57.082, 24.329, [
    `Ādažu\\s+(?:militār${L}\\s+)?(?:bāz${L}|poligon${L}|nometn${L})`,
    "Camp Ādaži",
    "Camp Adazi",
    "Adazi military base",
  ], 0.85),
  v("Rīga, Rīgas Doms", 56.949, 24.1047, [
    `Rīgas\\s+Dom(?:s|a|am|u|ā)`,
    { re: `Doma\\s+(?:baznīc${L}|laukum${L})`, strict: true },
    "Riga Cathedral",
  ], 0.85),
  v("Rīga, Rīgas dome", 56.9475, 24.1067, [`Rīgas\\s+dom(?:e|es|ei|i|ē)`], 0.8),

  // ----- Latvian cities & towns -----
  c("Rīga", 56.9496, 24.1052, [fa("Rīg"), "Riga"]),
  c("Daugavpils", 55.8714, 26.5161, [pils("Daugav")]),
  c("Liepāja", 56.5047, 21.0108, [fa("Liepāj"), "Liepaja"]),
  c("Jelgava", 56.6511, 23.7214, [fa("Jelgav")]),
  c("Jūrmala", 56.968, 23.7704, [fa("Jūrmal"), "Jurmala"]),
  c("Ventspils", 57.3894, 21.5644, [pils("Vents")]),
  c("Rēzekne", 56.5099, 27.3332, [fe("Rēzekn"), "Rezekne"]),
  c("Valmiera", 57.5385, 25.4264, [fa("Valmier")]),
  c("Jēkabpils", 56.499, 25.8574, [pils("Jēkab"), "Jekabpils"]),
  c("Ogre", 56.8162, 24.614, [fe("Ogr")]),
  c("Tukums", 56.967, 23.1554, [ms("Tukum")]),
  c("Cēsis", 57.3119, 25.2706, ["Cēs(?:is|u|īm|īs)", "Cesis"]),
  c("Sigulda", 57.1537, 24.8533, [fa("Siguld")]),
  c("Kuldīga", 56.9677, 21.968, [fa("Kuldīg"), "Kuldiga"]),
  c("Talsi", 57.2447, 22.589, [mi("Tals")]),
  c("Bauska", 56.4079, 24.1939, [fa("Bausk")]),
  c("Dobele", 56.6258, 23.2781, [fe("Dobel")]),
  c("Madona", 56.854, 26.217, [fa("Madon")]),
  c("Alūksne", 57.4242, 27.0466, [fe("Alūksn"), "Aluksne"]),
  c("Gulbene", 57.1775, 26.7527, [fe("Gulben")]),
  c("Balvi", 57.1313, 27.2654, [mi("Balv")]),
  c("Ludza", 56.5459, 27.7192, [fa("Ludz")]),
  c("Krāslava", 55.8951, 27.168, [fa("Krāslav"), "Kraslava"]),
  c("Preiļi", 56.2942, 26.7246, [mi("Preiļ"), "Preili"]),
  c("Limbaži", 57.5133, 24.7131, [mi("Limbaž"), "Limbazi"]),
  c("Saldus", 56.6637, 22.4881, ["Saldus", { re: "Saldū", strict: true }]),
  c("Aizkraukle", 56.6048, 25.2551, [fe("Aizkraukl")]),
  c("Smiltene", 57.4242, 25.9016, [fe("Smilten")]),
  c("Valka", 57.7752, 26.0179, [fa("Valk")]),
  c("Salaspils", 56.8614, 24.3497, [pils("Salas")]),
  c("Olaine", 56.7852, 23.9381, [fe("Olain")]),
  c("Ķekava", 56.828, 24.2304, [fa("Ķekav"), "Kekava"]),
  c("Mārupe", 56.9067, 24.057, [fe("Mārup"), "Marupe"]),
  c("Ādaži", 57.0749, 24.3227, [mi("Ādaž"), "Adazi"]),
  c("Līvāni", 56.354, 26.175, [mi("Līvān")]),
  c("Saulkrasti", 57.264, 24.4148, [mi("Saulkrast")]),
  c("Kandava", 57.0346, 22.7781, [fa("Kandav")]),
  c("Aizpute", 56.721, 21.601, [fe("Aizput")]),
  c("Grobiņa", 56.535, 21.1667, [fa("Grobiņ")]),
  c("Lielvārde", 56.718, 24.807, [fe("Lielvārd")]),
  c("Ikšķile", 56.835, 24.497, [fe("Ikšķil")]),
  c("Baldone", 56.742, 24.402, [fe("Baldon")]),
  c("Iecava", 56.597, 24.206, [fa("Iecav")]),
  c("Koknese", 56.645, 25.436, [fe("Koknes")]),
  c("Pļaviņas", 56.617, 25.724, [fpl("Pļaviņ")]),
  c("Viļāni", 56.552, 26.925, [mi("Viļān")]),
  c("Kārsava", 56.784, 27.689, [fa("Kārsav")]),
  c("Zilupe", 56.387, 28.122, [fe("Zilup")]),
  c("Dagda", 56.095, 27.537, [fa("Dagd")]),
  c("Salacgrīva", 57.753, 24.359, [fa("Salacgrīv")]),
  c("Rūjiena", 57.897, 25.327, [fa("Rūjien")]),
  c("Mazsalaca", 57.861, 25.056, [fa("Mazsalac")]),
  c("Skrunda", 56.676, 22.015, [fa("Skrund")]),
  c("Priekule", 56.446, 21.588, [fe("Priekul")]),
  c("Pāvilosta", 56.888, 21.186, [fa("Pāvilost")]),
  c("Ainaži", 57.863, 24.359, [mi("Ainaž")]),
  c("Sabile", 57.046, 22.573, [fe("Sabil")]),
  c("Auce", 56.46, 22.901, [fe("Auc")]),
  c("Ilūkste", 55.979, 26.297, [fe("Ilūkst")]),
  c("Varakļāni", 56.608, 26.756, [mi("Varakļān")]),
  c("Carnikava", 57.131, 24.284, [fa("Carnikav")]),
  c("Ropaži", 56.9733, 24.6317, [mi("Ropaž")]),
  c("Jaunjelgava", 56.612, 25.083, [fa("Jaunjelgav")]),
  c("Vangaži", 57.095, 24.559, [mi("Vangaž")]),
  c("Kalnciems", 56.797, 23.611, [ms("Kalnciem")]),

  // ----- Foreign capitals / hubs -----
  c("Brisele, Beļģija", 50.8503, 4.3517, [fe("Brisel"), "Brussels", "Bruxelles"]),
  c("Strasbūra, Francija", 48.5734, 7.7521, [fa("Strasbūr"), "Strasbourg"]),
  c("Vašingtona, ASV", 38.9072, -77.0369, [fa("Vašington"), "Washington"]),
  c("Ņujorka, ASV", 40.7128, -74.006, [fa("Ņujork"), "New\\s+York"]),
  c("Viļņa, Lietuva", 54.6872, 25.2797, [fa("Viļņ"), "Vilnius", "Viļņus"]),
  c("Tallina, Igaunija", 59.437, 24.7536, [fa("Tallin"), "Tallinn"]),
  c("Helsinki, Somija", 60.1699, 24.9384, ["Helsink(?:i|os|u|iem)"]),
  c("Stokholma, Zviedrija", 59.3293, 18.0686, [fa("Stokholm"), "Stockholm"]),
  c("Varšava, Polija", 52.2297, 21.0122, [fa("Varšav"), "Warsaw"]),
  c("Berlīne, Vācija", 52.52, 13.405, [fe("Berlīn"), "Berlin"]),
  c("Parīze, Francija", 48.8566, 2.3522, [fe("Parīz"), "Paris"]),
  c("Londona, Lielbritānija", 51.5074, -0.1278, [fa("London"), "London"]),
  c("Kijiva, Ukraina", 50.4501, 30.5234, [fa("Kijiv"), fa("Kijev"), "Kyiv", "Kiev"]),
  c("Kopenhāgena, Dānija", 55.6761, 12.5683, [fa("Kopenhāgen"), "Copenhagen"]),
  c("Oslo, Norvēģija", 59.9139, 10.7522, ["Oslo"]),
  c("Davosa, Šveice", 46.8027, 9.836, [fa("Davos"), "Davos"]),
  c("Minhene, Vācija", 48.1351, 11.582, [fe("Minhen"), "Munich", "München"]),
  c("Hāga, Nīderlande", 52.0705, 4.3007, [fa("Hāg"), "The\\s+Hague"]),
  c("Roma, Itālija", 41.9028, 12.4964, [fa("Rom"), "Rome"]),
  c("Vīne, Austrija", 48.2082, 16.3738, [{ re: fe("Vīn"), strict: true }, "Vienna"]),
  c("Prāga, Čehija", 50.0755, 14.4378, [fa("Prāg"), "Prague"]),
  c("Madride, Spānija", 40.4168, -3.7038, [fe("Madrid"), "Madrid"]),
  c("Amsterdama, Nīderlande", 52.3676, 4.9041, [fa("Amsterdam"), "Amsterdam"]),
  c("Ženēva, Šveice", 46.2044, 6.1432, [fa("Ženēv"), "Geneva"]),
  c("Luksemburga", 49.6116, 6.1319, [fa("Luksemburg"), "Luxembourg"]),
  c("Otava, Kanāda", 45.4215, -75.6972, [fa("Otav"), "Ottawa"]),
  c("Ankara, Turcija", 39.9334, 32.8597, [fa("Ankar")]),
  c("Kauņa, Lietuva", 54.8985, 23.9036, [fa("Kauņ"), "Kaunas"]),
  c("Tartu, Igaunija", 58.378, 26.729, ["Tartu"]),

  // ----- Keywords implying a place -----
  v("Vašingtona, Baltais nams", 38.8977, -77.0365, [
    `Baltaj(?:ā|ais|o)\\s+nam(?:ā|s|u)`,
    "White\\s+House",
  ], 0.85),
  k("Brisele, Eiropadome", 50.8423, 4.3828, [
    `Eiropadom${L}`,
    `ES\\s+(?:līderu\\s+)?samit${L}`,
    `Eiropas\\s+Savienības\\s+(?:līderu\\s+)?samit${L}`,
    `Eiropas\\s+Padom${L}`,
    "European\\s+Council",
    "EU\\s+summit",
  ]),
  k("Brisele, NATO galvenā mītne", 50.8796, 4.4262, [
    `NATO\\s+(?:galvenaj${L}\\s+mītn${L}|štāb${L}|mītn${L})`,
    "NATO\\s+headquarters",
  ]),
  k("Brisele, NATO", 50.8796, 4.4262, [`NATO\\s+samit${L}`, "NATO\\s+summit"], 0.4),
  k("Ņujorka, ANO galvenā mītne", 40.7489, -73.968, [
    `ANO\\s+Ģenerāl${L}\\s+asamblej${L}`,
    `ANO\\s+(?:galvenaj${L}\\s+)?mītn${L}`,
    "UN\\s+General\\s+Assembly",
  ]),
  k("Davosa, Šveice", 46.8027, 9.836, [
    `Pasaules\\s+ekonomikas\\s+forum${L}`,
    "World\\s+Economic\\s+Forum",
  ]),
  k("Minhene, Vācija", 48.1351, 11.582, [
    `Minhenes\\s+drošības\\s+konferenc${L}`,
    "Munich\\s+Security\\s+Conference",
  ]),

  // ----- Countries (only with a travel verb) -> capital, low confidence -----
  ctry("Viļņa, Lietuva", 54.6872, 25.2797, ["Lietuv(?:ā|u)", "Lithuania"]),
  ctry("Tallina, Igaunija", 59.437, 24.7536, ["Igaunij(?:ā|u)", "Estonia"]),
  ctry("Helsinki, Somija", 60.1699, 24.9384, ["Somij(?:ā|u)", "Finland"]),
  ctry("Stokholma, Zviedrija", 59.3293, 18.0686, ["Zviedrij(?:ā|u)", "Sweden"]),
  ctry("Varšava, Polija", 52.2297, 21.0122, ["Polij(?:ā|u)", "Poland"]),
  ctry("Berlīne, Vācija", 52.52, 13.405, ["Vācij(?:ā|u)", "Germany"]),
  ctry("Parīze, Francija", 48.8566, 2.3522, ["Francij(?:ā|u)", "France"]),
  ctry("Londona, Lielbritānija", 51.5074, -0.1278, [
    "Lielbritānij(?:ā|u)",
    "Apvienotaj(?:ā|o)\\s+Karalist(?:ē|i)",
    "the\\s+UK",
    "Britain",
  ]),
  ctry("Kijiva, Ukraina", 50.4501, 30.5234, ["Ukrain(?:ā|u)", "Ukraine"]),
  ctry("Vašingtona, ASV", 38.9072, -77.0369, ["ASV", "the\\s+US", "the\\s+United\\s+States"]),
  ctry("Kopenhāgena, Dānija", 55.6761, 12.5683, ["Dānij(?:ā|u)", "Denmark"]),
  ctry("Oslo, Norvēģija", 59.9139, 10.7522, ["Norvēģij(?:ā|u)", "Norway"]),
  ctry("Brisele, Beļģija", 50.8503, 4.3517, ["Beļģij(?:ā|u)", "Belgium"]),
  ctry("Hāga, Nīderlande", 52.0705, 4.3007, ["Nīderland(?:ē|i)", "the\\s+Netherlands"]),
  ctry("Roma, Itālija", 41.9028, 12.4964, ["Itālij(?:ā|u)", "Italy"]),
  ctry("Madride, Spānija", 40.4168, -3.7038, ["Spānij(?:ā|u)", "Spain"]),
  ctry("Otava, Kanāda", 45.4215, -75.6972, ["Kanād(?:ā|u)", "Canada"]),
  ctry("Tokija, Japāna", 35.6762, 139.6503, ["Japān(?:ā|u)", "Japan"]),
];

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Remove diacritics while preserving string length (index-compatible). */
function stripDiacritics(s: string): string {
  let out = "";
  for (const ch of s) {
    const base = ch.normalize("NFD")[0] ?? ch;
    // Keep UTF-16 length identical so indices map 1:1 to the original.
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

type Compiled = {
  place: Place;
  strict: RegExp[];
  loose: RegExp[];
  lower: boolean[]; // parallel to strict
  looseLower: boolean[]; // parallel to loose
};

const wrap = (src: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, "giu");

const COMPILED: Compiled[] = PLACES.map((place) => {
  const strict: RegExp[] = [];
  const lower: boolean[] = [];
  const loose: RegExp[] = [];
  const looseLower: boolean[] = [];
  for (const p of place.patterns) {
    const spec = typeof p === "string" ? { re: p } : p;
    strict.push(wrap(spec.re));
    lower.push(!!spec.lower);
    if (!spec.strict) {
      loose.push(wrap(stripDiacritics(spec.re)));
      looseLower.push(!!spec.lower);
    }
  }
  return { place, strict, loose, lower, looseLower };
});

const isUpper = (ch: string) => ch !== ch.toLowerCase() && ch === ch.toUpperCase();

type Hit = { place: Place; index: number; matched: string };

function firstMatch(
  res: RegExp[],
  lowers: boolean[],
  haystack: string,
  original: string,
): { index: number; matched: string } | undefined {
  let best: { index: number; matched: string } | undefined;
  res.forEach((re, i) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const matched = original.slice(m.index, m.index + m[0].length);
      // Proper nouns: require capitalised first letter (avoids e.g. "valkā" verb).
      if (lowers[i] || isUpper(matched[0])) {
        if (!best || m.index < best.index) best = { index: m.index, matched };
        break;
      }
    }
  });
  return best;
}

function collect(text: string, loose: boolean): Hit[] {
  const hay = loose ? stripDiacritics(text) : text;
  const hits: Hit[] = [];
  for (const cp of COMPILED) {
    const m = loose
      ? firstMatch(cp.loose, cp.looseLower, hay, text)
      : firstMatch(cp.strict, cp.lower, hay, text);
    if (m) hits.push({ place: cp.place, index: m.index, matched: m.matched });
  }
  return hits;
}

function pick(hits: Hit[]): Hit | undefined {
  return hits.sort(
    (a, b) =>
      b.place.tier - a.place.tier ||
      a.index - b.index ||
      b.place.confidence - a.place.confidence,
  )[0];
}

/**
 * Infer where an event happened from a news title + summary.
 * Most specific match wins (venue > city > keyword > country); among equally
 * specific matches the earliest mention in the text wins.
 * Returns undefined if nothing recognisable is mentioned.
 */
export function guessLocation(text: string): GeoGuess | undefined {
  if (!text) return undefined;
  const normalized = text.normalize("NFC");
  let hit = pick(collect(normalized, false));
  let penalty = 0;
  if (!hit) {
    hit = pick(collect(normalized, true));
    penalty = 0.05; // diacritic-insensitive fallback is slightly less certain
  }
  if (!hit) return undefined;
  const { place } = hit;
  return {
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    confidence: Math.max(0, Math.round((place.confidence - penalty) * 100) / 100),
    matchedText: hit.matched,
  };
}
