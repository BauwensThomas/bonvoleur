#!/usr/bin/env python3
"""
Scanner de deals BonVoleur (à faire tourner sur un PC allumé 24/7).

Source : Travelpayouts (gratuit + affilié). On interroge le billet le moins cher
de chaque route surveillée, on vérifie que le lien répond, puis on pousse le
deal à BonVoleur qui écrit l'email (Deal Writer) et l'envoie aux abonnés du bon
aéroport (Deal Sender).

Usage :
  export BONVOLEUR_URL="http://localhost:3000"
  export INGEST_SECRET="le-meme-que-dans-.env"
  export TRAVELPAYOUTS_TOKEN="ton-token"
  export TRAVELPAYOUTS_MARKER="ton-id-affilie"   # optionnel (commissions)
  python scripts/scanner.py

Dépendance :  pip install -r scripts/requirements.txt
"""

import datetime
import json
import os
import re
import time
import requests

BASE_URL = os.environ.get("BONVOLEUR_URL", "http://localhost:3000")
INGEST_SECRET = os.environ.get("INGEST_SECRET", "")
CRON_SECRET = os.environ.get("CRON_SECRET", "")

# Horaires de scan dans la journée (heure locale du PC), séparés par des virgules.
# Après CHAQUE scan, on envoie à chaque abonné les deals de son aéroport pas
# encore reçus (dédoublonnage via la table sends) : tout le monde est servi sur
# la journée, sans doublon. Defaut : 2 fois par jour (07h30 et 13h30).
SCAN_TIMES = [
    t.strip()
    for t in os.environ.get("SCAN_TIMES", "07:30,13:30,19:30").split(",")
    if t.strip()
]
# Le digest gratuit (hebdo) ne part qu'un jour par semaine (0 = lundi).
WEEKLY_WEEKDAY = int(os.environ.get("WEEKLY_WEEKDAY", "0"))

# Noms d'aéroports (code IATA -> ville) pour un affichage clair.
AIRPORT_NAMES = {
    "BRU": "Bruxelles", "CRL": "Charleroi", "LGG": "Liège", "ANR": "Anvers",
    "OST": "Ostende", "CDG": "Paris", "ORY": "Paris", "BVA": "Paris Beauvais",
    "LYS": "Lyon", "NCE": "Nice", "MRS": "Marseille", "BOD": "Bordeaux",
    "TLS": "Toulouse", "NTE": "Nantes", "LIL": "Lille", "SXB": "Strasbourg",
    "LIS": "Lisbonne", "BCN": "Barcelone", "RAK": "Marrakech", "FCO": "Rome",
    "JFK": "New York", "BKK": "Bangkok", "AGP": "Malaga", "OPO": "Porto",
    "KRK": "Cracovie", "ALC": "Alicante", "ATH": "Athènes", "MAD": "Madrid",
    "VLC": "Valence", "NAP": "Naples", "OPO2": "Porto",
}


def label(iata: str) -> str:
    """'BRU' -> 'Bruxelles (BRU)'. Si inconnu : '(BRU)'."""
    city = AIRPORT_NAMES.get(iata)
    return f"{city} ({iata})" if city else f"({iata})"


# Routes surveillées : origine -> {destination: prix max (en €)}.
# Adapte les seuils : court-courrier bas, long-courrier plus haut.
TRAVELPAYOUTS_WATCH = {
    "BRU": {"LIS": 130, "BCN": 90, "RAK": 130, "FCO": 90, "JFK": 400, "BKK": 500},
    "CRL": {"AGP": 80, "OPO": 90, "FCO": 90, "KRK": 80, "ALC": 80},
    "CDG": {"JFK": 400, "LIS": 130, "BCN": 90, "ATH": 140, "BKK": 500},
    "LYS": {"BCN": 90, "LIS": 140, "FCO": 90},
}

# --- Cache anti-doublon (ne pas renvoyer le même deal à chaque tour) ---
SEEN_FILE = os.path.join(os.path.dirname(__file__), ".seen.json")


def load_seen() -> set[str]:
    try:
        with open(SEEN_FILE, encoding="utf-8") as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def save_seen(seen: set[str]) -> None:
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted(seen), f)


def deal_key(deal: dict) -> str:
    return f"{deal['origin']}|{deal['destination']}|{deal['price']}|{deal['booking_url']}"


# --- Ecriture directe dans Supabase (plus aucun JSON) ---
# Le scanner ecrit les deals directement dans la table `deals` de Supabase via
# l'API REST (PostgREST), avec la SERVICE ROLE key. Dedoublonnage par booking_url.
import uuid as _uuid

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _sb_headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def deal_exists_in_db(booking_url: str) -> bool:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/deals",
        headers=_sb_headers(),
        params={"booking_url": f"eq.{booking_url}", "select": "id", "limit": "1"},
        timeout=15,
    )
    return r.ok and len(r.json()) > 0


def touch_deal(booking_url: str) -> None:
    """Deal deja en base : on rafraichit sa date 'vu pour la derniere fois'
    (published_at) pour que le premium voie une date recente. On NE supprime et
    NE remplace rien : tous les deals distincts sont conserves (controle des
    aeroports). created_at (premiere detection) reste fige pour le gating gratuit."""
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/deals",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        params={"booking_url": f"eq.{booking_url}"},
        json={"published_at": _now_iso()},
        timeout=20,
    )


def insert_deal_in_db(deal: dict) -> tuple[bool, str]:
    row = {
        "id": str(_uuid.uuid4()),
        "origin": deal["origin"],
        "destination": deal["destination"],
        "price": deal["price"],
        "normal_price": deal.get("normal_price"),
        "discount_pct": None,
        "dates": deal.get("dates", ""),
        "airline": deal.get("airline"),
        "booking_url": deal["booking_url"],
        "is_error_fare": bool(deal.get("is_error_fare", False)),
        "is_hot": deal.get("is_hot", True),
        "valid_until": None,
        "published_at": _now_iso(),  # date 'vu' = maintenant
        "email": None,
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/deals",
        headers={**_sb_headers(), "Prefer": "return=minimal"},
        json=row,
        timeout=20,
    )
    return r.ok, f"{r.status_code} {r.text}"


def link_is_accessible(url: str) -> bool:
    """Vérifie que le lien répond encore (anti deal mort)."""
    try:
        r = requests.head(url, allow_redirects=True, timeout=10)
        if r.status_code >= 400:
            r = requests.get(url, timeout=10)
        return r.status_code < 400
    except requests.RequestException:
        return False


def ddmm(date_str: str) -> str:
    """'2026-10-15' -> '1510' (format de recherche Aviasales : JJMM)."""
    m = re.match(r"\d{4}-(\d{2})-(\d{2})", date_str or "")
    return f"{m.group(2)}{m.group(1)}" if m else ""


def find_deals() -> list[dict]:
    token = os.environ.get("TRAVELPAYOUTS_TOKEN", "")
    if not token:
        print("TRAVELPAYOUTS_TOKEN manquant.")
        return []

    marker = os.environ.get("TRAVELPAYOUTS_MARKER", "")
    deals: list[dict] = []
    for origin, destinations in TRAVELPAYOUTS_WATCH.items():
        for dest, max_price in destinations.items():
            try:
                # Endpoint "cheapest" : le billet le moins cher de la route.
                r = requests.get(
                    "https://api.travelpayouts.com/v1/prices/cheap",
                    params={
                        "origin": origin,
                        "destination": dest,
                        "currency": "eur",
                        "token": token,
                    },
                    timeout=15,
                )
                routes = r.json().get("data", {}).get(dest, {})
            except requests.RequestException as e:
                print(f"Travelpayouts {origin}->{dest} erreur:", e)
                continue

            # On garde le MEILLEUR prix de la route, et on ne le retient que
            # si c'est un VRAI bon plan (sous le seuil). Sinon on ignore.
            items = [i for i in routes.values() if i.get("price")]
            if not items:
                continue
            item = min(items, key=lambda i: i["price"])
            price = int(item["price"])
            if price > max_price:
                continue
            depart = (item.get("departure_at") or "")[:10]
            ret = (item.get("return_at") or "")[:10]
            # locale=fr + currency=eur : page en francais et prix en euros.
            qs = ["currency=eur", "locale=fr"]
            if marker:
                qs.append(f"marker={marker}")
            url = (
                f"https://www.aviasales.com/search/"
                f"{origin}{ddmm(depart)}{dest}{ddmm(ret)}1?"
                + "&".join(qs)
            )
            deals.append(
                {
                    "origin": label(origin),       # ex "Bruxelles (BRU)"
                    "destination": label(dest),    # ex "Barcelone (BCN)"
                    "price": price,
                    "normal_price": None,
                    "dates": depart + (f" au {ret}" if ret else ""),
                    "airline": item.get("airline"),
                    "booking_url": url,
                    "is_error_fare": False,
                    "is_hot": True,
                    "autosend": False,
                }
            )
    return deals


def push_deal(deal: dict) -> str | None:
    """Crée le deal (sans envoi unitaire). Retourne l'id si nouveau, sinon None."""
    resp = requests.post(
        f"{BASE_URL}/api/ingest/deal",
        headers={"Authorization": f"Bearer {INGEST_SECRET}"},
        json=deal,
        timeout=30,
    )
    if not resp.ok:
        print(f"ERR {resp.status_code}: {resp.text}")
        return None
    data = resp.json()
    print(f"OK  {deal['origin']} -> {deal['destination']} ({deal['price']} EUR)")
    return None if data.get("duplicate") else data.get("dealId")


def run_once() -> None:
    deals = find_deals()
    seen = load_seen()
    new_ids: list[str] = []
    known_count = 0
    print(f"{len(deals)} deal(s) candidat(s)")
    for deal in deals:
        key = deal_key(deal)
        if key in seen:
            known_count += 1
            continue
        if not link_is_accessible(deal["booking_url"]):
            print(f"SKIP lien mort : {deal['booking_url']}")
            continue
        deal_id = push_deal(deal)
        seen.add(key)
        if deal_id:
            new_ids.append(deal_id)
    save_seen(seen)
    print(f"Bilan : {len(new_ids)} nouveau(x) deal(s) enregistre(s), {known_count} deja connu(s)")


# --- Horaires ---
def next_scan_time() -> datetime.datetime:
    """Prochaine heure de scan parmi SCAN_TIMES (aujourd'hui ou demain)."""
    now = datetime.datetime.now()
    candidates = []
    for hhmm in SCAN_TIMES:
        h, m = map(int, hhmm.split(":"))
        t = now.replace(hour=h, minute=m, second=0, microsecond=0)
        if t <= now:
            t += datetime.timedelta(days=1)
        candidates.append(t)
    return min(candidates)


def sleep_until(target: datetime.datetime) -> None:
    delta = (target - datetime.datetime.now()).total_seconds()
    if delta > 0:
        time.sleep(delta)


def call_digest(path: str) -> None:
    headers = {"Authorization": f"Bearer {CRON_SECRET}"} if CRON_SECRET else {}
    try:
        r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=120)
        if r.ok:
            print(f"{path} -> {r.json()}")
        else:
            print(f"{path} ERR {r.status_code}: {r.text}")
    except requests.RequestException as e:
        print(f"{path} erreur:", e)


def send_digests() -> None:
    """Envoie juste après un scan. Le dedoublonnage (table sends) garantit
    qu'un abonne ne recoit jamais deux fois le meme deal : sur les runs du jour,
    chaque aeroport ayant eu un deal est couvert, une seule fois."""
    print("Envoi des digests...")
    call_digest("/api/cron/digest-daily")  # premium : a chaque run, nouveautes seulement
    if datetime.datetime.now().weekday() == WEEKLY_WEEKDAY:
        call_digest("/api/cron/digest-weekly")  # gratuit : une fois par semaine


def run_supabase() -> None:
    """Mode Supabase : trouve les deals, verifie les liens, et les ecrit
    directement dans la table `deals` de Supabase (dedoublonnage par booking_url).
    N'envoie aucun email (le site s'en charge via ses crons en lisant Supabase)."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Definis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.")
    deals = find_deals()
    added = refreshed = skipped = 0
    print(f"{len(deals)} deal(s) candidat(s)")
    for d in deals:
        if not link_is_accessible(d["booking_url"]):
            print(f"SKIP lien mort : {d['booking_url']}")
            skipped += 1
            continue
        if deal_exists_in_db(d["booking_url"]):
            touch_deal(d["booking_url"])  # deal connu : on rafraichit sa date 'vu'
            refreshed += 1
            continue
        ok, info = insert_deal_in_db(d)
        if ok:
            print(f"OK  {d['origin']} -> {d['destination']} ({d['price']} EUR)")
            added += 1
        else:
            print(f"ERR insert : {info}")
    print(f"Supabase : {added} ajout(s), {refreshed} rafraichi(s), {skipped} lien(s) mort(s)")


if __name__ == "__main__":
    import sys

    # Mode "--supabase" : ecrit les deals directement dans Supabase, sans email.
    # Pas besoin d'INGEST_SECRET (aucun appel au site).
    if "--supabase" in sys.argv:
        print("Scanner BonVoleur (mode Supabase)")
        run_supabase()
        raise SystemExit(0)

    if not INGEST_SECRET:
        raise SystemExit("Definis INGEST_SECRET (la meme valeur que dans .env.local).")

    # Mode "--once" : un seul scan + envoi puis on s'arrete. Pour les
    # hebergements qui lancent le script a heure fixe (GitHub Actions, cron...).
    if "--once" in sys.argv:
        print(f"Scanner BonVoleur (one-shot) -> {BASE_URL}")
        run_once()
        send_digests()
        raise SystemExit(0)

    # Mode démon : tourne en continu et scanne aux heures definies (PC 24/7).
    print(f"Scanner BonVoleur demarre -> {BASE_URL} | scans : {', '.join(SCAN_TIMES)}")
    try:
        run_once()  # scan immediat au demarrage (feedback), sans envoi
    except Exception as e:
        print("Erreur scan initial:", e)

    while True:
        try:
            t = next_scan_time()
            print(f"Prochain scan : {t.strftime('%d/%m a %H:%M')}")
            sleep_until(t)
            run_once()
            send_digests()  # envoi juste apres le scan (dedoublonne)
        except Exception as e:  # ne jamais crasher la boucle 24/7
            print("Erreur:", e)
            time.sleep(300)
