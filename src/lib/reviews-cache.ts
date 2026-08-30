import "server-only";

import { unstable_cache } from "next/cache";
import { getAll } from "./db";
import type { Tables } from "./types";

const getCachedPublicReviews = unstable_cache(
  () =>
    getAll(
      "reviews",
      "id,rating,name,comment,status,created_at,subscriber_id"
    ),
  ["reviews-public"],
  { tags: ["reviews-public"], revalidate: 60 }
);

export async function getPublicReviews(): Promise<Tables["reviews"][]> {
  return getCachedPublicReviews();
}