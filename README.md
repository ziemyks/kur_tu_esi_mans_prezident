# Kur tu esi, mans premjer?

Next.js lapa, kas seko Latvijas Ministru prezidenta publiskajām aktivitātēm: jaunākās ziņas, publicētās bildes un aptuvenā atrašanās vieta kartē (noteikta no ziņu virsrakstiem).

## Datu avoti (bez API atslēgām)
- mk.gov.lv jaunumi (skrāpēti, jo RSS nav)
- LSM, Delfi, TVNET, Apollo RSS (filtrēti pēc vārda)
- Google News RSS meklēšana
- Valsts kancelejas Flickr (bildes)
- Karte: Esri Dark Gray + Leaflet

Personu un avotus maina `src/lib/config.ts`. Vietu vārdnīca ir `src/lib/geo.ts`.
Dati tiek atjaunoti ik 10 min (ISR), lapa pati pārlādējas ik 5 min.

## Palaišana
```bash
npm install
npm run dev
```

## Publicēšana Vercel
```bash
npx vercel        # pirmā reize — piesaista projektu
npx vercel --prod
```
Vai arī: iepush GitHub un importē repo vercel.com — vides mainīgie nav vajadzīgi.

Ziemas riepu reklāma (`src/components/WinterTireAd*.tsx`) ir viettura ar izdomātu veikalu — nomaini saiti uz īsto partneri.
