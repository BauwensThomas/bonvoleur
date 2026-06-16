-- Schema BonVoleur pour Supabase (Postgres).
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller -> Run.
-- Les ids sont en TEXT (on accepte des ids non-uuid comme "seed-1").
-- L'app accede a ces tables via la SERVICE ROLE key (cote serveur, bypass RLS).
-- RLS est activee partout : la cle anon ne peut donc rien lire (protege les emails).

create table if not exists subscribers (
  id text primary key,
  email text unique not null,
  tier text not null default 'free',
  home_airports text[] not null default '{}',
  email_frequency text,
  unsubscribe_token text,
  consent_at timestamptz,
  unsubscribed_at timestamptz,
  referrer_id text,
  created_at timestamptz not null default now()
);

create table if not exists deals (
  id text primary key,
  origin text not null,
  destination text not null,
  price integer not null,
  normal_price integer,
  discount_pct integer,
  dates text,
  airline text,
  booking_url text not null,
  is_error_fare boolean not null default false,
  is_hot boolean not null default true,
  valid_until text,
  published_at timestamptz,
  email jsonb,
  created_at timestamptz not null default now()
);
create index if not exists deals_booking_url_idx on deals (booking_url);
create index if not exists deals_created_at_idx on deals (created_at);

create table if not exists routes (
  id text primary key,
  origin_iata text not null,
  destination_iata text not null,
  slug text,
  avg_price numeric,
  created_at timestamptz not null default now()
);

create table if not exists airports (
  id text primary key,
  iata text not null,
  name text not null,
  city text not null,
  country text not null,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id text primary key,
  referrer_id text,
  referred_id text,
  status text,
  reward_granted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sends (
  id text primary key,
  deal_id text not null,
  subscriber_id text not null,
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sends_pair_idx on sends (deal_id, subscriber_id);

create table if not exists posts (
  id text primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  faq jsonb not null default '[]',
  cover_image text,
  meta_title text,
  meta_description text,
  status text not null default 'draft',
  author text,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists admins (
  id text primary key,
  email text not null,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists partners (
  id text primary key,
  name text not null,
  logo text,
  url text,
  affiliate_url text,
  category text,
  description text,
  is_active boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id text primary key,
  agent_name text not null,
  started_at timestamptz,
  finished_at timestamptz,
  status text,
  trigger text,
  summary text,
  output_ref text,
  error text,
  created_at timestamptz not null default now()
);

-- RLS : activee, sans policy => seule la service role key (serveur) accede.
alter table subscribers enable row level security;
alter table deals enable row level security;
alter table routes enable row level security;
alter table airports enable row level security;
alter table referrals enable row level security;
alter table sends enable row level security;
alter table posts enable row level security;
alter table admins enable row level security;
alter table partners enable row level security;
alter table agent_runs enable row level security;
