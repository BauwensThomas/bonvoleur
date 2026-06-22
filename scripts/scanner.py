#!/usr/bin/env python3
"""
Scanner de deals BonVoleur (à faire tourner sur un PC allumé 24/7).

Sources (toutes gratuites) :
  1. Travelpayouts (affilié) : billet le moins cher des routes surveillées
     (bonne couverture OTA + long-courrier). Lien de resa = Aviasales (commission).
  2. API publique Ryanair : decouvre les allers-retours low-cost les moins chers
     depuis nos bases Ryanair (Charleroi surtout, que Travelpayouts ne voit pas).
     Lien de resa = Ryanair direct (prix exact).
  3. Travelpayouts city-directions : decouverte large (toutes compagnies, court +
     long-courrier) des AR les moins chers vers toutes les destinations, pour
     elargir la base. Lien de resa = Aviasales (affiliation).
On verifie que le lien repond, puis on pousse le deal a BonVoleur qui ecrit
l'email (Deal Writer) et l'envoie aux abonnes du bon aeroport (Deal Sender).

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
    "VLC": "Valence", "NAP": "Naples", "OPO2": "Porto", "GIG": "Rio de Janeiro",
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
    "CDG": {"JFK": 400, "LIS": 130, "BCN": 90, "ATH": 140, "BKK": 500, "GIG": 600},
    "LYS": {"BCN": 90, "LIS": 140, "FCO": 90},
}

# --- Source #2 : API publique Ryanair (gratuite, sans cle) ---
# Travelpayouts couvre mal les compagnies low-cost (Ryanair, Wizz) qui bloquent
# les OTA : c'est pourquoi Charleroi (100% low-cost) restait vide. On interroge
# directement l'API de Ryanair pour DECOUVRIR les allers-retours les moins chers
# depuis nos aeroports Ryanair, sous un plafond. Lien de resa = Ryanair direct
# (prix exact). Les nouvelles villes creent leur fiche automatiquement.
RYANAIR_ORIGINS = [
    o.strip().upper()
    for o in os.environ.get("RYANAIR_ORIGINS", "CRL,BRU,LYS").split(",")
    if o.strip()
]
RYANAIR_MAX_EUR = int(os.environ.get("RYANAIR_MAX_EUR", "150"))  # plafond AR "bon plan"
RYANAIR_LIMIT = int(os.environ.get("RYANAIR_LIMIT", "16"))  # nb max de villes / origine (16 = max API)
RYANAIR_TRIP_MIN = int(os.environ.get("RYANAIR_TRIP_MIN", "2"))  # duree sejour min (jours)
RYANAIR_TRIP_MAX = int(os.environ.get("RYANAIR_TRIP_MAX", "14"))  # duree sejour max

# Ryanair bloque les User-Agent par defaut : on se presente comme un navigateur.
_UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

# --- Source #3 : decouverte Travelpayouts (city-directions) ---
# Les vols les moins chers depuis chaque aeroport vers TOUTES les destinations
# (toutes compagnies, court + long-courrier) : elargit la base au-dela des routes
# surveillees. Lien de resa = Aviasales (affiliation). Les noms de villes viennent
# de la base Travelpayouts (cities.json FR), pour creer des fiches propres.
DISCOVERY_ORIGINS = [
    o.strip().upper()
    for o in os.environ.get("DISCOVERY_ORIGINS", "BRU,CRL,CDG,LYS").split(",")
    if o.strip()
]
# Plafond genereux pour attraper aussi le long-courrier abordable (NYC, etc.).
# On garde quand meme les MOINS CHERS (city-directions renvoie ~30 dest/aeroport).
DISCOVERY_MAX_EUR = int(os.environ.get("DISCOVERY_MAX_EUR", "400"))  # plafond AR
DISCOVERY_LIMIT = int(os.environ.get("DISCOVERY_LIMIT", "30"))  # villes / origine
DISCOVERY_MAX_TRANSFERS = int(os.environ.get("DISCOVERY_MAX_TRANSFERS", "1"))

_CITY_NAMES: dict[str, str] = {}


def city_name(code: str) -> str:
    """Nom FR d'une ville (base Travelpayouts), AIRPORT_NAMES prioritaire.
    Renvoie '' si inconnu (on saute alors le deal pour eviter un label '(XXX)')."""
    if code in AIRPORT_NAMES:
        return AIRPORT_NAMES[code]
    if not _CITY_NAMES:
        try:
            r = requests.get(
                "https://api.travelpayouts.com/data/fr/cities.json",
                headers=_UA,
                timeout=30,
            )
            for c in r.json():
                if c.get("code") and c.get("name"):
                    _CITY_NAMES[c["code"]] = c["name"]
        except (requests.RequestException, ValueError):
            pass
    return _CITY_NAMES.get(code, "")

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
    # Liens Ryanair (API) et Aviasales (page de recherche, toujours en ligne) :
    # le prix vient de l'API source, ces URL sont fiables -> on ne les teste pas
    # (gain de temps important quand il y a beaucoup de deals).
    if "ryanair.com" in url or "aviasales.com" in url:
        return True
    try:
        r = requests.head(url, allow_redirects=True, timeout=10, headers=_UA)
        if r.status_code >= 400:
            r = requests.get(url, timeout=10, headers=_UA)
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
    deals.extend(find_ryanair_deals())
    deals.extend(find_discovery_deals())
    return deals


def find_discovery_deals() -> list[dict]:
    """Decouverte large via Travelpayouts city-directions : les AR les moins chers
    depuis chaque aeroport vers toutes les destinations (toutes compagnies). On
    garde, par origine, les DISCOVERY_LIMIT moins chers sous le plafond."""
    token = os.environ.get("TRAVELPAYOUTS_TOKEN", "")
    if not token:
        return []
    marker = os.environ.get("TRAVELPAYOUTS_MARKER", "")
    deals: list[dict] = []
    for origin in DISCOVERY_ORIGINS:
        try:
            r = requests.get(
                "https://api.travelpayouts.com/v1/city-directions",
                params={"origin": origin, "currency": "eur", "token": token},
                timeout=20,
            )
            data = r.json().get("data", {})
        except (requests.RequestException, ValueError) as e:
            print(f"Discovery {origin} erreur:", e)
            continue

        items = []
        for dest, it in data.items():
            price = it.get("price")
            if price is None or int(price) > DISCOVERY_MAX_EUR:
                continue
            if (it.get("transfers") or 0) > DISCOVERY_MAX_TRANSFERS:
                continue
            items.append((dest, it, int(price)))
        items.sort(key=lambda x: x[2])

        kept = 0
        for dest, it, price in items[:DISCOVERY_LIMIT]:
            city = city_name(dest)
            if not city:
                continue  # ville inconnue : on saute (pas de label '(XXX)')
            depart = (it.get("departure_at") or "")[:10]
            ret = (it.get("return_at") or "")[:10]
            qs = ["currency=eur", "locale=fr"]
            if marker:
                qs.append(f"marker={marker}")
            url = (
                f"https://www.aviasales.com/search/"
                f"{origin}{ddmm(depart)}{dest}{ddmm(ret)}1?" + "&".join(qs)
            )
            deals.append(
                {
                    "origin": label(origin),
                    "destination": f"{city} ({dest})",
                    "price": price,
                    "normal_price": None,
                    "dates": depart + (f" au {ret}" if ret else ""),
                    "airline": it.get("airline"),
                    "booking_url": url,
                    "is_error_fare": False,
                    "is_hot": True,
                    "autosend": False,
                }
            )
            kept += 1
        print(f"Discovery {origin} : {kept} ville(s) sous {DISCOVERY_MAX_EUR} EUR")
    return deals


def _ryanair_url(origin: str, dest: str, date_out: str, date_in: str) -> str:
    """Lien profond vers la reservation Ryanair (route + dates pre-remplies)."""
    return (
        "https://www.ryanair.com/fr/fr/trip/flights/select"
        "?adults=1&teens=0&children=0&infants=0&isConnectedFlight=false"
        f"&isReturn=true&discount=0&dateOut={date_out}&dateIn={date_in}"
        f"&originIata={origin}&destinationIata={dest}"
    )


def find_ryanair_deals() -> list[dict]:
    """Allers-retours les moins chers depuis nos aeroports Ryanair (API publique,
    gratuite). Decouvre de nouvelles villes : on garde, par origine, les
    RYANAIR_LIMIT routes les moins cheres sous RYANAIR_MAX_EUR."""
    today = datetime.date.today()
    out_from = (today + datetime.timedelta(days=1)).isoformat()
    out_to = (today + datetime.timedelta(days=180)).isoformat()
    in_from = (today + datetime.timedelta(days=3)).isoformat()
    in_to = (today + datetime.timedelta(days=200)).isoformat()
    deals: list[dict] = []
    for origin in RYANAIR_ORIGINS:
        try:
            r = requests.get(
                "https://services-api.ryanair.com/farfnd/v4/roundTripFares",
                params={
                    "departureAirportIataCode": origin,
                    "outboundDepartureDateFrom": out_from,
                    "outboundDepartureDateTo": out_to,
                    "inboundDepartureDateFrom": in_from,
                    "inboundDepartureDateTo": in_to,
                    "durationFrom": RYANAIR_TRIP_MIN,
                    "durationTo": RYANAIR_TRIP_MAX,
                    "adultPaxCount": 1,
                    "market": "fr-fr",
                    "limit": 16,  # max accepte par l'API Ryanair (au-dela: InvalidLimit)
                },
                headers=_UA,
                timeout=20,
            )
            fares = r.json().get("fares", [])
        except (requests.RequestException, ValueError) as e:
            print(f"Ryanair {origin} erreur:", e)
            continue

        best: dict[str, dict] = {}  # 1 entree par destination (la moins chere)
        for f in fares:
            ob, ib = f.get("outbound") or {}, f.get("inbound") or {}
            ap = ob.get("arrivalAirport") or {}
            dest = ap.get("iataCode")
            op = (ob.get("price") or {}).get("value")
            ip = (ib.get("price") or {}).get("value")
            if not dest or op is None or ip is None:
                continue
            total = round(op + ip, 2)
            if total > RYANAIR_MAX_EUR:
                continue
            if dest in best and best[dest]["_total"] <= total:
                continue
            # Nom de ville : notre table si connue (coherence), sinon Ryanair.
            city = AIRPORT_NAMES.get(dest) or (ap.get("city") or {}).get("name") or ap.get("name") or dest
            date_out = (ob.get("departureDate") or "")[:10]
            date_in = (ib.get("departureDate") or "")[:10]
            best[dest] = {
                "_total": total,
                "origin": label(origin),
                "destination": f"{city} ({dest})",
                "price": int(round(total)),
                "normal_price": None,
                "dates": date_out + (f" au {date_in}" if date_in else ""),
                "airline": "Ryanair",
                "booking_url": _ryanair_url(origin, dest, date_out, date_in),
                "is_error_fare": False,
                "is_hot": True,
                "autosend": False,
            }
        ranked = sorted(best.values(), key=lambda d: d["_total"])[:RYANAIR_LIMIT]
        for d in ranked:
            d.pop("_total", None)
            deals.append(d)
        print(f"Ryanair {origin} : {len(ranked)} route(s) sous {RYANAIR_MAX_EUR} EUR")
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
