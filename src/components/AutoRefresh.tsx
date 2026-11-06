"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server data every `seconds` while the tab is visible. */
export default function AutoRefresh({ seconds = 300 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
