# StudyMind AI

A full-stack study workspace that turns accessible YouTube captions into grounded study notes, revision sheets, quizzes, and lecture-context chat. When live credentials are absent, the app provides clearly labelled sample material; it does **not** pretend to analyze a video.

## Features

- Responsive public site and authenticated student workspace
- YouTube caption retrieval and AI-generated notes (server-side only)
- Notes, folders, bookmarks, PDF export, revision timer, saved quiz attempts, and contextual assistant
- Supabase Auth/Postgres persistence with row-level security
- Explicit local sample mode when Supabase is not configured
- Prerendered public SEO pages, sitemap, and robots.txt

## Local setup

Requirements: Node.js 20.19+ and npm.

```sh
npm install
cp .env.example .env
npm run dev
```

Set the credentials described in `.env.example` to enable live accounts, persistence, and AI. Without them, enter the clearly labelled sample mode. Never put service-role or AI keys in `VITE_*` variables.

For Supabase, apply `supabase/schema.sql` in the project SQL editor, enable email/password auth, and configure the site's redirect URLs. For live notes, set `OPENAI_API_KEY`; the server retrieves actual captions first and rejects inaccessible or insufficient transcripts instead of inferring from titles. Optional `YOUTUBE_PROXY_URL` may be used for a compliant network proxy.

## Verification

```sh
npm test
npx eslint src server api scripts tests --quiet
npm run build
npm run test:e2e
```

The end-to-end suite starts a production preview on port 3000. Keep that port available. Tests require Playwright Chromium installed (`npx playwright install chromium`).

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, environment, SEO, and launch notes. Set `SITE_URL` and `VITE_SITE_URL` to the actual canonical domain before building for production.