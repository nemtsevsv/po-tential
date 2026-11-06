# PO-tential

Standalone market-potential tool: the **Regions** block extracted from DMS
(Regions overview, country card, HS Codes), for use by other businesses.
Own Supabase project, own GitHub repo, own Vercel project — no link to DMS.

## What's inside

- **Regions** (`/countries`) — totals (countries, population, HNWI, GDP) and the country list.
- **Country card** (`/countries/[id]`) — country data (World Bank, GeoNames, manual fields),
  Trade Overview chart, Market Opportunity, trade data table (Eurostat load / Excel upload / export).
- **HS Codes** (`/countries/hs-codes`) — product groups and HS codes. This list drives
  - which codes "Load from Eurostat" requests (codes ticked *Eurostat API*);
  - the Product Group shown in Trade Overview and Market Opportunity (rows are matched to the
    settings by HS-code prefix, so renaming a group updates every chart).

Differences from DMS: no dealers, no "EU Export, mio EUR" widget, no hardcoded country list,
Blaser-style palette, mobile layout (bottom navigation, card views).

## External data sources

| Source | Used for | Notes |
|---|---|---|
| World Bank API | area, population, growth, GDP, urban population | public, no key |
| GeoNames | 5 biggest cities | needs `GEONAMES_USERNAME` with *Free Web Services* enabled |
| Eurostat Comext DS-059341 | exports from EU member states to a country, 2014 → now | HS 2/4/6 digits (8-digit CN codes are truncated to 6); reporters are always EU countries — a source limitation |

Countries must be named as in the reference list (`country_master`, 249 countries) — the
New Country form suggests names from it — so the loaders can resolve the ISO code.

## Users

Sign-in is email + password. Users are created in Supabase → Authentication → Users → *Add user*
(sign-ups are disabled). Every signed-in user has full access.

## Environment variables (Vercel)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable (or legacy anon) key |
| `GEONAMES_USERNAME` | GeoNames account name |

## Database

Migrations in `supabase/migrations` (schema + RLS, then the 249-country reference list).
Apply with `npx supabase db push` or in the SQL editor, in file-name order.

## Local development

```bash
npm ci
cp .env.example .env.local   # fill in
npm run dev
```
