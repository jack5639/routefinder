import type { SourceAdapter } from "@/lib/catalog/sources/types";
import { fetchDiscoverUniSource } from "@/lib/catalog/sources/discover-uni";
import { fetchFindApprenticeshipEnglandSource } from "@/lib/catalog/sources/find-apprenticeship-england";
import { fetchUcasSource } from "@/lib/catalog/sources/ucas";

export const sourceAdapters: SourceAdapter[] = [
  {
    source: "discoverUni",
    fetch: fetchDiscoverUniSource,
  },
  {
    source: "ucas",
    fetch: fetchUcasSource,
  },
  {
    source: "findApprenticeshipEngland",
    fetch: fetchFindApprenticeshipEnglandSource,
  },
];
