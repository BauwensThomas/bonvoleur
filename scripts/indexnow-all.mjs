// Soumet TOUTES les URLs du sitemap de production a IndexNow.
// Usage : npm run indexnow:all   (necessite CRON_SECRET dans .env.local)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const base = process.env.SITE_URL || "https://www.bonvoleur.com";
const res = await fetch(`${base}/api/cron/indexnow?all=1`, {
  headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
});
console.log(res.status, await res.text());
process.exit(res.ok ? 0 : 1);
