"use client";

import { useState, useEffect, useRef, type ComponentType, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

type Status = "idle" | "loading" | "success" | "error";
type Step = "details" | "password";
type GoogleBtnProps = { next: string; label: string };
type AirportOption = { iata: string; city: string };

// Inscription en 2 etapes : (1) email + aeroport + consentement, (2) mot de
// passe. L'aeroport est stocke dans user_metadata au moment du signUp() pour
// ne jamais etre redemande - resolveMemberState() (member-auth.ts) l'utilise
// pour creer le compte automatiquement des la confirmation par email, sans
// repasser par /compte/finaliser (reserve au parcours Google, qui ne fournit
// jamais d'aeroport).
export default function SignupForm({ airports }: { airports: AirportOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [GoogleBtn, setGoogleBtn] = useState<ComponentType<GoogleBtnProps> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot anti-spam

  useEffect(() => {
    // Chunk Supabase chargé uniquement quand le formulaire entre dans le viewport.
    // Aucun <link rel=prefetch> généré (import() brut, pas next/dynamic).
    // Sur mobile Lighthouse (pas de scroll), ce chunk ne se charge jamais.
    const el = formRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          import("@/components/GoogleSignInButton").then(
            (mod) => setGoogleBtn(() => mod.default)
          );
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function goToPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (website.trim() !== "") return; // honeypot rempli -> silencieux
    setStep("password");
  }

  async function onSubmitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const passwordConfirm = String(data.get("password_confirm") ?? "");

    if (password !== passwordConfirm) {
      setStatus("error");
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    const supabase = createSupabaseBrowser();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/compte`,
        data: { home_airport: homeAirport },
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    // Email deja inscrit : Supabase renvoie un "faux succes" avec un tableau
    // d'identites vide (comportement standard, evite l'enumeration de comptes).
    // Aucun email n'est envoye dans ce cas - on l'explique sur /compte plutot
    // que de rediriger silencieusement (source de confusion sinon : la
    // personne attend un email de confirmation qui ne viendra jamais).
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      router.push("/compte?existing=1");
      return;
    }

    setStatus("success");
    setMessage(
      "Presque fini ! Ouvre l'email qu'on vient de t'envoyer et clique sur le lien pour confirmer ton inscription."
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <p className="font-semibold text-emerald-800">Bienvenue à bord</p>
        <p className="mt-1 text-sm text-emerald-700">{message}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={step === "details" ? goToPassword : onSubmitPassword}
      className="space-y-4"
    >
      {step === "details" && (
        <>
          {GoogleBtn ? (
            <GoogleBtn next="/compte" label="S'inscrire avec Google" />
          ) : (
            <div className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-500">
              Connexion avec Google
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            ou par email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      {step === "details" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Ton email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="home_airport" className="block text-sm font-medium mb-1">
                Ton aéroport de départ
              </label>
              <select
                id="home_airport"
                name="home_airport"
                required
                value={homeAirport}
                onChange={(e) => setHomeAirport(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none bg-white"
              >
                <option value="">Choisis ton aéroport</option>
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.city} ({a.iata})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Gratuit : 1 aéroport, 1 email par semaine. Premium : plusieurs
                aéroports, 1 email par jour.
              </p>
            </div>
          </div>

          {/* Honeypot : caché, ne pas remplir */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Ne pas remplir</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input
              name="consent"
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              J&apos;accepte de recevoir les alertes deals, la newsletter, et la{" "}
              <a href="/confidentialite" className="underline">
                politique de confidentialité
              </a>
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Continuer
          </button>

          <p className="text-xs text-slate-500 text-center">
            Gratuit. Désinscription en un clic. Pas de spam.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setStatus("idle");
              setMessage("");
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Retour
          </button>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Choisis un mot de passe
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
            />
          </div>
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium mb-1">
              Confirme ton mot de passe
            </label>
            <PasswordInput
              id="password_confirm"
              name="password_confirm"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Création du compte..." : "Créer mon compte"}
          </button>
        </>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}
