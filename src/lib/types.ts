// Schéma de données aligné sur la cible Supabase (voir context.md).
// En local, chaque "table" est un fichier JSON dans /data.
// Au passage en Supabase (Phase 1), seules les implémentations de lib/db.ts changent.

export type Tier = "free" | "premium";
// Fréquence d'email choisie par l'abonné. "none" = ne reçoit aucun email
// (consulte seulement le dashboard). Defaut selon le tier (premium=daily, free=weekly).
export type EmailFrequency = "daily" | "weekly" | "none";
export type PostStatus = "draft" | "published";
export type AgentRunStatus = "success" | "error" | "draft";
export type AgentTrigger = "cron" | "manuel" | "auto";
export type ReferralStatus = "pending" | "confirmed";

export interface Subscriber {
  id: string;
  email: string;
  tier: Tier;
  home_airports: string[]; // aéroports de départ choisis (codes IATA)
  email_frequency?: EmailFrequency; // préférence d'email (defaut selon le tier)
  newsletter?: boolean; // newsletter blog hebdo (vendredi). Défaut: activée.
  stripe_customer_id?: string | null; // lien vers le client Stripe (premium)
  premium_until?: string | null; // fin de la période payée en cours (ISO)
  premium_cancel_at_period_end?: boolean | null; // résilié -> ne se renouvelle pas
  premium_interval?: string | null; // "month" | "year" (cadence de facturation)
  unsubscribe_token: string; // jeton secret pour la désinscription en 1 clic
  consent_at: string | null;
  unsubscribed_at: string | null;
  referrer_id: string | null;
  created_at: string;
}

export interface DealEmail {
  subject: string;
  body: string;
  generated_at: string;
}

export interface Deal {
  id: string;
  origin: string;
  destination: string;
  price: number;
  normal_price: number | null;
  discount_pct: number | null;
  dates: string;
  airline: string | null;
  booking_url: string;
  is_error_fare: boolean;
  is_hot: boolean; // vrai bon plan (sous le seuil) vs simple "meilleur prix dispo"
  valid_until: string | null;
  published_at: string | null;
  email: DealEmail | null;
  created_at: string;
}

export interface Route {
  id: string;
  slug: string;
  origin_iata: string;
  origin_city: string;
  destination_iata: string;
  destination_city: string;
  intro: string | null;
  airlines: string[];
  duration: string | null;
  best_period: string | null;
  tips: string[];
  image_url: string | null;
  image_credit: string | null;
  region: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface Airport {
  id: string;
  iata: string;
  name: string;
  city: string;
  country: "BE" | "FR";
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: ReferralStatus;
  reward_granted_at: string | null;
  created_at: string;
}

export interface Send {
  id: string;
  deal_id: string;
  subscriber_id: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  faq: FaqItem[];
  cover_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: PostStatus;
  author: string;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo: string | null;
  url: string;
  affiliate_url: string;
  category: string;
  description: string;
  is_active: boolean;
  position: number;
  updated_at: string;
  created_at: string;
}

export interface AgentRun {
  id: string;
  agent_name: string;
  started_at: string;
  finished_at: string | null;
  status: AgentRunStatus;
  trigger: AgentTrigger;
  summary: string;
  output_ref: string | null;
  error: string | null;
  created_at: string;
}

// Map nom de table -> type de ligne
export interface Tables {
  subscribers: Subscriber;
  deals: Deal;
  routes: Route;
  airports: Airport;
  referrals: Referral;
  sends: Send;
  posts: Post;
  admins: Admin;
  partners: Partner;
  agent_runs: AgentRun;
}

export type TableName = keyof Tables;
