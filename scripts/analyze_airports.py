#!/usr/bin/env python3
"""
Analyse de couverture des aéroports BE/FR.

But : voir, sur la période récente, combien de bons plans chaque aéroport a eu
et surtout sur combien de JOURS distincts il a eu au moins un deal. Ça permet de
choisir quels aéroports proposer à l'inscription (ceux qui ont des deals presque
tous les jours = fiables pour les abonnés premium).

Sources :
  travelpayouts (défaut) : cache Travelpayouts /v2/prices/latest — approximation
                           basée sur ce que Travelpayouts a vu récemment. Rapide,
                           mais ne couvre pas Ryanair ni la vraie fréquence réelle.
  supabase               : nos propres deals scannés (table `deals` en base).
                           Le vrai historique jour par jour, le plus fiable.
                           Nécessite SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
  local (déprécié)       : ancien fichier data/deals.json, n'existe plus.

Usage :
  python scripts/analyze_airports.py                        # cache Travelpayouts
  python scripts/analyze_airports.py --source supabase      # historique réel (recommandé)
  python scripts/analyze_airports.py --source supabase --days 30
  python scripts/analyze_airports.py --max 150              # deals < 150 EUR seulement
"""

import argparse
import datetime
import json
import os
import re
from collections import defaultdict

import requests

DEALS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "deals.json")

# Aéroports BE/FR à analyser.
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
    """Offres les moins chères récemment trouvées au départ de `origin` (cache TP)."""
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


def collect_supabase(cutoff: datetime.date, max_price: int) -> dict[str, dict[str, int]]:
    """Lit les deals depuis Supabase -> {iata: {jour: nb}}.
    C'est le VRAI historique issu de nos propres scans."""
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise SystemExit("Definis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.")

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }

    res: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    offset = 0
    limit = 1000
    total_rows = 0

    print(f"Lecture Supabase depuis {cutoff}...")
    while True:
        params: dict = {
            "select": "origin,price,created_at",
            "created_at": f"gte.{cutoff.isoformat()}",
            "order": "created_at.asc",
            "limit": limit,
            "offset": offset,
        }
        if max_price:
            params["price"] = f"lte.{max_price}"

        r = requests.get(f"{url}/rest/v1/deals", headers=headers, params=params, timeout=30)
        if not r.ok:
            raise SystemExit(f"Erreur Supabase {r.status_code}: {r.text}")

        rows = r.json()
        if not rows:
            break

        for d in rows:
            iata = iata_of(d.get("origin", ""))
            day = (d.get("created_at") or "")[:10]
            if iata and day:
                res[iata][day] += 1
        total_rows += len(rows)

        if len(rows) < limit:
            break
        offset += limit

    print(f"{total_rows} deals lus depuis Supabase.")
    return dict(res)


def collect_local(cutoff: datetime.date) -> dict[str, dict[str, int]]:
    """(Déprécié) Lit data/deals.json — fichier supprimé depuis migration Supabase."""
    try:
        with open(DEALS_FILE, encoding="utf-8") as f:
            deals = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        print("ATTENTION : data/deals.json introuvable (migré vers Supabase). Utilise --source supabase.")
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
    if not TOKEN:
        raise SystemExit("Definis TRAVELPAYOUTS_TOKEN.")
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
    p.add_argument(
        "--source",
        choices=["travelpayouts", "supabase", "local"],
        default="travelpayouts",
        help="supabase = historique réel (recommandé) ; travelpayouts = cache TP (rapide) ; local = déprécié",
    )
    args = p.parse_args()

    cutoff = datetime.date.today() - datetime.timedelta(days=args.days)

    if args.source == "supabase":
        data = collect_supabase(cutoff, args.max)
    elif args.source == "local":
        data = collect_local(cutoff)
    else:
        data = collect_travelpayouts(cutoff, args.max)

    # On affiche tous les aéroports de la liste, même ceux sans aucun deal.
    rows = []
    for iata, city in AIRPORTS.items():
        per_day = data.get(iata, {})
        total = sum(per_day.values())
        days_with = len(per_day)
        rows.append((iata, city, total, days_with, round(total / max(args.days, 1), 1)))

    rows.sort(key=lambda r: r[3], reverse=True)

    label = f"--source {args.source}" + (f" (deals < {args.max} EUR)" if args.max else "")
    print(f"\nCouverture sur {args.days} jours ({label}) :\n")
    print(f"{'IATA':5} {'Ville':16} {'offres':>7} {'jours avec deal':>16} {'deals/jour':>11}")
    print("-" * 60)
    for iata, city, total, days_with, avg in rows:
        flag = "  <- fiable" if days_with >= args.days * 0.8 else ("  <- à surveiller" if days_with >= args.days * 0.4 else "")
        print(f"{iata:5} {city:16} {total:>7} {days_with:>14}/{args.days} {avg:>11}{flag}")

    print("\n'fiable'       = deals au moins 80 % des jours.")
    print("'à surveiller' = deals entre 40 % et 80 % des jours.")
    print("Proposer à l'inscription uniquement les aéroports 'fiables'.")
    if args.source != "supabase":
        print("\nConseil : relance avec --source supabase après quelques semaines de scan")
        print("pour avoir l'historique réel (inclut Ryanair + toutes les sources).")


if __name__ == "__main__":
    main()
