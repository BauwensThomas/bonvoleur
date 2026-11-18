// Lien d'aperçu privé d'un article non publié, partageable sans compte admin
// (ex. pour le faire relire par la personne citée). Jeton signé : expiration +
// HMAC du slug, sans rien stocker en base. Format : "<expiration epoch s>.<hmac hex>".
import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { adminToken } from "./auth";

const DEFAULT_DAYS = 7;

function sign(slug: string, exp: number): string {
  return createHmac("sha256", adminToken()).update(`preview|${slug}|${exp}`).digest("hex");
}

export function makePreviewToken(slug: string, days = DEFAULT_DAYS): string {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  return `${exp}.${sign(slug, exp)}`;
}

export function verifyPreviewToken(slug: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expStr, mac] = token.split(".");
  const exp = Number(expStr);
  if (!mac || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(slug, exp);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
