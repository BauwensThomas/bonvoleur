import "server-only";

import { unstable_cache } from "next/cache";
import { getAll } from "./db";
import type { Tables } from "./types";

const getCachedPublicPartners = unstable_cache(
  () =>
    getAll(
      "partners",
      "id,name,logo,url,affiliate_url,category,description,is_active,position"
    ),
  ["partners-public"],
  { tags: ["partners-public"], revalidate: 60 }
);

export async function getPublicPartners(): Promise<Tables["partners"][]> {
  return getCachedPublicPartners();
}