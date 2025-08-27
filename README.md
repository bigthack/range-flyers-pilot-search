# Range Flyers — Pilot Qualification Search (Scaffold)

TypeScript/Next.js + Postgres scaffold to build a searchable UI/UX for finding pilots in the FAA Airmen
downloadable database who are likely qualified to fly a given aircraft (e.g., by type rating and core ratings).
This is **scaffolding**; TODOs are left for your team to implement.

## Quick Start
1) `cp .env.example .env.local` (fill values; add MAPBOX_TOKEN if you want radius search)
2) `docker compose up -d db`
3) `pnpm i` (or `npm i`)
4) `pnpm db:push`
5) `pnpm etl:download`  (optional)
6) `pnpm etl:import`
7) `pnpm etl:index`
8) `pnpm dev` → http://localhost:3000

## Includes
- Next.js 14 App Router, minimal search UI
- Prisma + Postgres models for airmen/certs/ratings/type-ratings
- ETL scripts for FAA releasable CSVs
- Aircraft autosuggest via mapping CSV
- City+State radius filter (Mapbox geocoding + DB cache)
- Freshness banner from local CSV mtimes
