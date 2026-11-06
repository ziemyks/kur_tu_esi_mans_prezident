"use client";

import dynamic from "next/dynamic";
import type { LiveMapProps } from "./LiveMap";

const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0b0b0f] text-sm text-orange-300/80">
      Ielādē karti…
    </div>
  ),
});

export type MapClientProps = LiveMapProps;

export default function MapClient(props: MapClientProps) {
  return <LiveMap {...props} />;
}
