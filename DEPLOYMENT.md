# Deployment guide

## Vercel

1. Import this repository into Vercel; use the project root containing `package.json`.
2. Select the Vite framework preset (or configure `npm run build` and `dist` as output). The included `vercel.json` routes `/api/*` to the Express adapter at `api/index.js` and sends application paths to the SPA shell; public routes are prerendered during the build.
3. Add production environment variables before the first production build:
   - `SITE_URL` and `VITE_SITE_URL`: canonical HTTPS origin, e.g. `https://studymind.example`.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: browser-safe Supabase project URL and anon key.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`: server-side project URL and anon key for protected operations.
   - `OPENAI_API_KEY`: server-only AI key. Optionally `OPENAI_MODEL` (default `gpt-4.1-mini`) and `YOUTUBE_PROXY_URL` for a compliant proxy.
4. Run `supabase/schema.sql` in Supabase. Configure email/password auth, allowed production redirect URLs, and email confirmation policy.
5. Redeploy after changing environment variables; Vite-prefixed values are embedded at build time. Verify `/api/health`, sign-up/sign-in, RLS ownership, and one real captioned public lecture.

## Security and product behavior

Never expose OpenAI keys, Supabase service-role keys, or server secrets in `VITE_*` variables. The app uses Supabase RLS and server-side AI. Transcript restrictions, missing captions, and short transcripts are errors—not permission to invent lecture content. If live credentials are missing, only the labelled local sample experience is available.

## SEO and launch checklist

- Set the real canonical URL before `npm run build`; review `dist/sitemap.xml`, `dist/robots.txt`, page metadata, and social-card URL.
- Add `public/social-card.png` (1200×630) before launch; no social card is committed yet.
- Check title/description/canonical tags on public pages and keep private workspace/auth/API routes out of the sitemap.
- Run `npm test`, lint, `npm run build`, and `npm run test:e2e`; manually verify mobile layout, Hindi PDF glyph rendering, Supabase persistence, and AI/caption access from the deployed server.
- Review provider quotas, rate limits, Supabase backups, privacy/terms, and email deliverability before inviting users.

## Operational note

The included API is serverless-friendly, but YouTube's automated-access controls can block transcript fetches from some hosting regions. Test a captioned video from the deployed environment. If access is restricted, configure a compliant proxy or report that captions are temporarily unavailable; never claim analysis succeeded without receiving its transcript.