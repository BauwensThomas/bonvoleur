#!/usr/bin/env python3
"""
Analyse de couverture des aéroports BE/FR.

But : voir, sur la période récente, combien de bons plans chaque aéroport a eu
et surtout sur combien de JOURS distincts il a eu au moins un deal. Ça permet de
choisir quels aéroports proposer à l'inscription (ceux qui ont des deals presque
tous les jours = fiables pour les abonnés premium).

Source : Travelpayouts /v2/prices/latest (prix les moins chers récemment trouvés,
chacun horodaté par "found_at"). C'est une approximation basée sur le cache
Travelpayouts. Pour un historique exact au jour le jour, il faudrait accumuler
nos propres scans dans le temps (le scanner le fera au fil des semaines).

Usage :
  export TRAVELPAYOUTS_TOKEN="ton-token"
  python scripts/analyze_airports.py            # tous les aéroports
  python scripts/analyze_airports.py --max 150  # ne compter que les deals < 150 EUR
  python scripts/analyze_airports.py --days 60  # fenêtre d'analyse (jours)
"""

import argparse
import datetime
import json
import os
import re
from collections import defaultdict

import requests

DEALS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "deals.json")

# Aéroports BE/FR à tester (large, pour comparer).
AIRPORTS = {
    "BRU": "Bruxelles",
    "CRL": "Charleroi",
    "LGG": "Liège",
    "ANR": "Anvers",
    "OST": "Ostende",
    "CDG": "Paris CDG",
    "ORY": "Paris Orly",
    "BVA": "Paris Beauvais",
    "LYS": "Lyon",
    "NCE": "Nice",
    "MRS": "Marseille",
    "BOD": "Bordeaux",
    "TLS": "Toulouse",
    "NTE": "Nantes",
    "LIL": "Lille",
    "MPL": "Montpellier",
    "SXB": "Strasbourg",
}

TOKEN = os.environ.get("TRAVELPAYOUTS_TOKEN", "")


def fetch_offers(origin: str) -> list[dict]:
    """Offres les moins chères récemment trouvées au départ de `origin`."""
    try:
        r = requests.get(
            "https://api.travelpayouts.com/v2/prices/latest",
            params={
                "origin": origin,
                "currency": "eur",
                "period_type": "month",
                "one_way": "false",
                "page": 1,
                "limit": 1000,
                "show_to_affiliates": "true",
                "sorting": "price",
                "token": TOKEN,
            },
            timeout=20,
        )
        return r.json().get("data", [])
    except requests.RequestException as e:
        print(f"  {origin} erreur API:", e)
        return []


def iata_of(origin: str) -> str | None:
    m = re.search(r"\(([A-Z]{3})\)", origin or "")
    return m.group(1) if m else None


def collect_local(cutoff: datetime.date) -> dict[str, dict[str, int]]:
    """Lit nos propres deals scannés (data/deals.json) -> {iata: {jour: nb}}.
    C'est le VRAI historique jour par jour, fiable au fil du temps."""
    try:
        with open(DEALS_FILE, encoding="utf-8") as f:
            deals = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    res: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for d in deals:
        iata = iata_of(d.get("origin", ""))
        day = (d.get("created_at") or "")[:10]
        if not iata or not day:
            continue
        try:
            if datetime.date.fromisoformat(day) < cutoff:
                continue
        except ValueError:
            continue
        res[iata][day] += 1
    return res


def collect_travelpayouts(cutoff: datetime.date, max_price: int) -> dict[str, dict[str, int]]:
    res: dict[str, dict[str, int]] = {}
    for iata in AIRPORTS:
        per_day: dict[str, int] = defaultdict(int)
        for o in fetch_offers(iata):
            price = o.get("value")
            if not price or (max_price and price > max_price):
                continue
            found = (o.get("found_at") or "")[:10]
            try:
                if not found or datetime.date.fromisoformat(found) < cutoff:
                    continue
            except ValueError:
                continue
            per_day[found] += 1
        res[iata] = per_day
    return res


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--max", type=int, default=0, help="prix max pour compter un deal (0 = tous)")
    p.add_argument("--days", type=int, default=60, help="fenêtre d'analyse en jours")
    p.add_argument("--source", choices=["travelpayouts", "local"], default="travelpayouts",
                   help="travelpayouts = volume du cache ; local = nos propres scans (historique reel)")
    args = p.parse_args()

    cutoff = datetime.date.today() - datetime.timedelta(days=args.days)

    if args.source == "local":
        data = collect_local(cutoff)
    else:
        if not TOKEN:
            raise SystemExit("Definis TRAVELPAYOUTS_TOKEN.")
        data = collect_travelpayouts(cutoff, args.max)

    rows = []
    for iata, per_day in data.items():
        total = sum(per_day.values())
        days_with = len(per_day)
        rows.append((iata, AIRPORTS.get(iata, iata), total, days_with, round(total / args.days, 1)))

    # Tri par nombre de jours couverts (le plus fiable en haut).
    rows.sort(key=lambda r: r[3], reverse=True)

    print(f"\nCouverture sur {args.days} jours" + (f" (deals < {args.max} EUR)" if args.max else "") + " :\n")
    print(f"{'IATA':5} {'Ville':14} {'offres':>7} {'jours avec deal':>16} {'deals/jour':>11}")
    print("-" * 58)
    for iata, city, total, days_with, avg in rows:
        flag = "  <- fiable" if days_with >= args.days * 0.8 else ""
        print(f"{iata:5} {city:14} {total:>7} {days_with:>14}/{args.days} {avg:>11}{flag}")

    print("\n'fiable' = des deals au moins 80% des jours de la periode.")
    print("Proposez à l'inscription surtout ces aéroports-là.")


if __name__ == "__main__":
    main()
