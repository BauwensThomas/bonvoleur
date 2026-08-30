import { readFile } from "node:fs/promises";

const env = {};
for (const line of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local");
}

const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};
const rows = [];

for (let offset = 0; ; offset += 1000) {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/routes`);
  url.searchParams.set("select", "id,slug,photos");
  url.searchParams.set("photos", "not.is.null");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", "1000");

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const page = await response.json();
  rows.push(...page);
  if (page.length < 1000) break;
}

let photoEntries = 0;
let storageUrls = 0;
let externalUrls = 0;
let inlineOrBase64 = 0;
let invalidUrls = 0;
const offenders = [];

for (const row of rows) {
  for (const photo of Array.isArray(row.photos) ? row.photos : []) {
    photoEntries++;
    const url = typeof photo?.url === "string" ? photo.url : "";
    if (/\/storage\/v1\/object\/(public|sign|authenticated)\/photos\//i.test(url)) {
      storageUrls++;
    } else if (/^data:/i.test(url) || /base64/i.test(url)) {
      inlineOrBase64++;
      offenders.push(`${row.slug}: inline/base64`);
    } else if (/^https?:\/\//i.test(url)) {
      externalUrls++;
      offenders.push(`${row.slug}: ${url.slice(0, 120)}`);
    } else {
      invalidUrls++;
      offenders.push(`${row.slug}: URL absente/invalide`);
    }
  }
}

console.log(JSON.stringify({
  routesWithPhotos: rows.length,
  photoEntries,
  storageUrls,
  externalUrls,
  inlineOrBase64,
  invalidUrls,
  offenders,
}, null, 2));