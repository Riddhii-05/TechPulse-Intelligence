# TechPulse

An AI-powered developer intelligence workspace for GitHub analytics, technology signals, and personalized learning guidance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/techpulse/src/App.tsx` — the product UI and route surface
- `artifacts/api-server/src/routes/pulse.ts` — TechPulse API, GitHub/Hacker News reads, OAuth, and Gemini analysis
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/techpulse.ts` — persisted repository and AI analysis tables

## Architecture decisions

- The frontend uses generated OpenAPI React Query hooks so UI data contracts stay aligned with the API.
- Demo data is explicit and labeled; live GitHub/Hacker News reads are used when optional configuration is present.
- Gemini is called only from the API server and returns metadata-based fallback analysis when unavailable.
- GitHub OAuth tokens stay in server memory behind HTTP-only cookies and are never returned to the browser.

## Product

TechPulse gives developers a single view of their repositories, activity signals, technology news, trends, AI project analysis, and next learning recommendations.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
