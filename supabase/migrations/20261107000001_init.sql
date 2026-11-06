-- PO-tential — initial schema (Regions block, extracted from DMS).
-- Single role: every authenticated user has full access; anonymous has none.

create extension if not exists "uuid-ossp";

-- Reference list of all countries (ISO 3166-1 alpha-2). Read-only for users.
create table if not exists public.country_master (
  iso2 text primary key,
  country_en text not null,
  country_de text,
  continent_en text,
  continent_de text,
  languages_en text,
  languages_de text,
  language_codes text,
  capital text,
  currency text,
  official_languages text,
  regional_official_languages text,
  created_at timestamptz default now()
);
create unique index if not exists country_master_country_en_lower on public.country_master (lower(country_en));

create table if not exists public.countries (
  id serial primary key,
  name text not null unique,
  capital text,
  biggest_cities text,
  area numeric,
  population numeric,
  population_growth_rate numeric,
  urban_population_pct numeric,
  gdp numeric,
  gdp_growth_rate numeric,
  gdp_ppp numeric,
  gdp_ppp_growth_rate numeric,
  vat numeric,
  hnwi numeric,
  created_by text,
  updated_at timestamptz default now()
);

create table if not exists public.hs_codes (
  id uuid primary key default uuid_generate_v4(),
  product_group text not null,
  product text not null,
  hs_code text not null unique check (hs_code ~ '^([0-9]{2}|[0-9]{4}|[0-9]{6}|[0-9]{8})$'),
  eurostat_api boolean not null default true,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists public.trade_data (
  id uuid primary key default uuid_generate_v4(),
  exporting_country text not null,
  importing_country text not null,
  product_group text,
  product text,
  hs_code text,
  flow text not null check (flow in ('import', 'export')),
  year integer not null,
  quantity numeric,
  value numeric,
  source text not null default 'file' check (source in ('file', 'eurostat')),
  uploaded_by text,
  created_at timestamptz default now()
);
create index if not exists idx_trade_data_exporting on public.trade_data (exporting_country);
create index if not exists idx_trade_data_importing on public.trade_data (importing_country);
create index if not exists idx_trade_data_hs_code on public.trade_data (hs_code);
create index if not exists idx_trade_data_year on public.trade_data (year);

-- Row Level Security
alter table public.country_master enable row level security;
alter table public.countries enable row level security;
alter table public.hs_codes enable row level security;
alter table public.trade_data enable row level security;

drop policy if exists "authenticated_read" on public.country_master;
create policy "authenticated_read" on public.country_master for select to authenticated using (true);

drop policy if exists "authenticated_all" on public.countries;
create policy "authenticated_all" on public.countries for all to authenticated using (true) with check (true);
drop policy if exists "authenticated_all" on public.hs_codes;
create policy "authenticated_all" on public.hs_codes for all to authenticated using (true) with check (true);
drop policy if exists "authenticated_all" on public.trade_data;
create policy "authenticated_all" on public.trade_data for all to authenticated using (true) with check (true);

-- No table access for anonymous visitors.
revoke all on public.country_master, public.countries, public.hs_codes, public.trade_data from anon;
