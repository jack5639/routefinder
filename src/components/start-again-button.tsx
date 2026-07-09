"use client";

import { useRouter } from "next/navigation";
import { clearRoutefinderLocalState } from "@/lib/app-storage";

export function StartAgainButton() {
  const router = useRouter();

  function handleStartAgain() {
    clearRoutefinderLocalState();
    router.push("/quiz");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleStartAgain}
      className="shrink-0 rounded-full px-3 py-2 text-ink/70 transition hover:bg-[#ffe0d8] hover:text-ink"
    >
      Start again
    </button>
  );
}
