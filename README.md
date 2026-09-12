# TechPulse

TechPulse is an AI-powered developer intelligence workspace. It combines GitHub repository signals, analytics, technology news, trending projects, and personalized learning guidance in one focused dashboard.

## What is included

- Public landing page and demo workspace
- Responsive developer dashboard
- Repository search, sorting, filtering, and detail views
- GitHub profile/repository reads with honest demo fallback data
- GitHub OAuth endpoints with HTTP-only session cookies
- Repository analytics built with Recharts
- Live Hacker News feed with fallback content
- Live GitHub trending repository search with fallback content
- Server-side Gemini repository analysis
- Personalized learning recommendations
- Settings screen with sync, theme, logout, and data-status controls
- Drizzle/PostgreSQL schema for synced repositories and saved AI analyses

## Stack

- React + Vite + TypeScript
- Tailwind CSS, Radix UI primitives, Framer Motion
- Recharts and Lucide React
- Express API server
- PostgreSQL + Drizzle ORM
- GitHub REST API, Hacker News API, Gemini API

## Project structure

```text
artifacts/techpulse/       React frontend
artifacts/api-server/      Express API routes
lib/api-spec/              OpenAPI source of truth
lib/api-client-react/      Generated React Query client
lib/api-zod/               Generated server schemas
lib/db/                    Drizzle schema and database client
```

## Run locally in Replit

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

The configured workflows start the API and web services. The web app is available from the preview pane.

## Environment variables

Copy `.env.example` into your local environment or add values through Replit Secrets.

### Required for AI

`GEMINI_API_KEY` enables server-side repository analysis. The browser never receives this value. If it is absent or the provider is unavailable, TechPulse returns a clearly labeled metadata-based analysis instead.

### Optional GitHub connection

`GITHUB_USERNAME` and `GITHUB_TOKEN` enable a public/profile API fallback without OAuth.

For the full GitHub OAuth flow, configure:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`
- `APP_URL`

The callback URL for a local API is:

```text
http://localhost:5000/api/github/callback
```

For a published app, use the published API callback URL and register the same URL in the GitHub OAuth application.

## Database

The project uses the PostgreSQL database provisioned for the workspace and Drizzle ORM.

```bash
pnpm --filter @workspace/db run push
```

The schema includes `techpulse_repositories` and `techpulse_analyses`, with cascading deletion from repository records to their saved analyses.

## Deployment

Publish the web artifact from Replit. The artifact serves the Vite build as a static site, and the shared API workflow serves `/api` routes. Add the required secret values in the production environment before publishing, then update the GitHub OAuth callback URL to the published domain.

## Troubleshooting

- If the dashboard shows `DEMO DATA`, the app is functioning but no GitHub profile is connected. Configure `GITHUB_USERNAME` or GitHub OAuth.
- If AI analysis returns `metadata-fallback`, the Gemini key is absent, invalid, rate-limited, or temporarily unavailable.
- If news or trending cards fall back, the upstream public API timed out or rate-limited the request; the app remains usable.
- Run `pnpm run typecheck` after changing the OpenAPI schema or shared database types.