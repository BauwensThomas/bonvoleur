// Source de vérité unique pour les aéroports actifs sur le site.
// Lire depuis Supabase (table airports, colonne active = true).
// Repli sur les 4 aéroports historiques si la DB est inaccessible.
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const AIRPORT_NAMES: Record<string, { city: string; country: "BE" | "FR" }> = {
  BRU: { city: "Bruxelles",      country: "BE" },
  CRL: { city: "Charleroi",      country: "BE" },
  LGG: { city: "Liège",          country: "BE" },
  ANR: { city: "Anvers",         country: "BE" },
  OST: { city: "Ostende",        country: "BE" },
  CDG: { city: "Paris CDG",      country: "FR" },
  ORY: { city: "Paris Orly",     country: "FR" },
  BVA: { city: "Paris Beauvais", country: "FR" },
  LYS: { city: "Lyon",           country: "FR" },
  NCE: { city: "Nice",           country: "FR" },
  MRS: { city: "Marseille",      country: "FR" },
  BOD: { city: "Bordeaux",       country: "FR" },
  TLS: { city: "Toulouse",       country: "FR" },
  NTE: { city: "Nantes",         country: "FR" },
  LIL: { city: "Lille",          country: "FR" },
  MPL: { city: "Montpellier",    country: "FR" },
  SXB: { city: "Strasbourg",     country: "FR" },
};

export function getAirportName(iata: string): string {
  return AIRPORT_NAMES[iata.toUpperCase()]?.city ?? iata.toUpperCase();
}

export interface ActiveAirport {
  iata: string;
  city: string;
  country: "BE" | "FR";
}

const FALLBACK: ActiveAirport[] = [
  { iata: "BRU", city: "Bruxelles", country: "BE" },
  { iata: "CRL", city: "Charleroi", country: "BE" },
  { iata: "CDG", city: "Paris CDG", country: "FR" },
  { iata: "LYS", city: "Lyon",      country: "FR" },
];

async function fetchActiveAirports(): Promise<ActiveAirport[]> {
  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await sb
      .from("airports")
      .select("iata, city, country")
      .eq("active", true)
      .order("country")
      .order("city");
    return data?.length ? (data as ActiveAirport[]) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

const getCachedActiveAirports = unstable_cache(
  fetchActiveAirports,
  ["airports-public"],
  { tags: ["airports-public"], revalidate: 60 }
);

export async function getActiveAirports(): Promise<ActiveAirport[]> {
  return getCachedActiveAirports();
}

export async function getActiveAirportCodes(): Promise<Set<string>> {
  const list = await getActiveAirports();
  return new Set(list.map((a) => a.iata));
}
