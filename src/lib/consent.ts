// Gestion du consentement cookies (côté client uniquement).
// Tant que l'utilisateur n'a pas accepté, aucun script de mesure d'audience ni
// de publicité (Google AdSense, analytics) ne doit etre chargé.

export const CONSENT_KEY = "bv_cookie_consent";
export const CONSENT_EVENT = "bv:consent-changed";
export const OPEN_SETTINGS_EVENT = "bv:open-cookie-settings";

export type ConsentChoice = "accepted" | "refused";

interface StoredConsent {
  choice: ConsentChoice;
  date: string;
}

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    return parsed.choice ?? null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  const value: StoredConsent = { choice, date: new Date().toISOString() };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

// Réouvre le bandeau pour modifier son choix (depuis le footer par exemple).
export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}
