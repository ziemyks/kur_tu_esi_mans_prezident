import ActivityFeed from "@/components/ActivityFeed";
import AutoRefresh from "@/components/AutoRefresh";
import MapClient from "@/components/MapClient";
import PhotoGallery from "@/components/PhotoGallery";
import WinterTireAd from "@/components/WinterTireAd";
import WinterTireAdStrip from "@/components/WinterTireAdStrip";
import { PERSON } from "@/lib/config";
import { getFeed } from "@/lib/feeds";

export const revalidate = 600;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("lv-LV", {
    timeZone: "Europe/Riga",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function Home() {
  const data = await getFeed();
  const last = data.lastKnown;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
      <AutoRefresh seconds={300} />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fire">
            {PERSON.role} · tiešraide
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            Kur tu esi, <span className="text-fire-light">{PERSON.displayName}</span>?
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          Atjaunots: <time dateTime={data.updatedAt}>{fmt(data.updatedAt)}</time>
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="relative h-[55vh] min-h-[360px] overflow-hidden rounded-2xl border border-zinc-800">
          <MapClient lastKnown={last} activities={data.activities} />
          <div className="pointer-events-none absolute bottom-8 left-3 z-[500] max-w-[80%] rounded-xl bg-black/70 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Pēdējā zināmā vieta</p>
            {last ? (
              <>
                <p className="text-lg font-semibold text-fire-light">🔥 {last.geo.name}</p>
                <p className="text-xs text-zinc-400">{fmt(last.publishedAt)} · {last.source}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-300">Vēl nav noteikta</p>
            )}
          </div>
        </div>

        <aside className="max-h-[55vh] min-h-[360px] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="mb-3 text-lg font-semibold">Jaunākās aktivitātes</h2>
          <ActivityFeed activities={data.activities} />
        </aside>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">Pēdējās publicētās bildes</h2>
        <PhotoGallery photos={data.photos} />
      </section>

      <p className="mt-10 text-xs leading-relaxed text-zinc-500">
        Atrašanās vieta ir aptuvens minējums, kas automātiski nolasīts no publiski pieejamu ziņu
        virsrakstiem — tā nav reāllaika izsekošana. Ziņas un attēli pieder to izdevējiem; spied uz
        ieraksta, lai atvērtu oriģinālo avotu.
      </p>

      <section className="mt-10">
        <WinterTireAd />
      </section>

      <WinterTireAdStrip sticky />
    </main>
  );
}
