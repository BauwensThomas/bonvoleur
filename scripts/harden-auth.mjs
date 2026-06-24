// Durcit la configuration d'authentification (GoTrue) via l'API Management
// Supabase, pour lever les avertissements Advisor liés à l'auth :
//   - leaked password protection (HaveIBeenPwned)
//   - expiration OTP / magic link <= 1h
//   - MFA TOTP disponible
//
// Requiert dans .env.local :
//   SUPABASE_URL            (pour déduire le project ref)
//   SUPABASE_ACCESS_TOKEN   (jeton perso : https://supabase.com/dashboard/account/tokens)
//
// Usage : npm run harden:auth   (ou node scripts/harden-auth.mjs)

import { readFile } from "node:fs/promises";

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* CI */
}

const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN absent dans .env.local.\n" +
      "  Crée un jeton sur https://supabase.com/dashboard/account/tokens\n" +
      "  puis ajoute :  SUPABASE_ACCESS_TOKEN=sbp_..."
  );
  process.exit(1);
}

const ref = new URL(env.SUPABASE_URL).host.split(".")[0];
const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// Réglages de durcissement.
// NB : password_hibp_enabled (mots de passe fuités) est réservé au plan Pro ET
// inutile ici (auth passwordless : magic link + Google). On ne le pousse pas.
const patch = {
  mailer_otp_exp: 3600, // expiration des liens/codes email : 1h max
  mfa_totp_enroll_enabled: true, // proposer la MFA par appli (TOTP)
  mfa_totp_verify_enabled: true,
};

const before = await (await fetch(api, { headers })).json();
console.log("Avant :", {
  password_hibp_enabled: before.password_hibp_enabled,
  mailer_otp_exp: before.mailer_otp_exp,
  mfa_totp_enroll_enabled: before.mfa_totp_enroll_enabled,
  mfa_totp_verify_enabled: before.mfa_totp_verify_enabled,
});

const res = await fetch(api, {
  method: "PATCH",
  headers,
  body: JSON.stringify(patch),
});
if (!res.ok) {
  console.error("Echec PATCH:", res.status, await res.text());
  process.exit(1);
}

const after = await res.json();
console.log("Après :", {
  password_hibp_enabled: after.password_hibp_enabled,
  mailer_otp_exp: after.mailer_otp_exp,
  mfa_totp_enroll_enabled: after.mfa_totp_enroll_enabled,
  mfa_totp_verify_enabled: after.mfa_totp_verify_enabled,
});
console.log("\nConfig auth durcie.");
