import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
const root = process.cwd();
const base = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://studymind.example.vercel.app').replace(/\/$/, '');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', resolve: { alias: { 'react-router-dom': path.join(root, 'node_modules/react-router-dom/dist/index.mjs'), 'react-router': path.join(root, 'node_modules/react-router/dist/development/index.mjs') } }, ssr: { noExternal: ['react-router', 'react-router-dom'] }, optimizeDeps: { noDiscovery: true, include: [] } });
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
try {
  const { renderPublicPage } = await vite.ssrLoadModule('/src/entry-server.jsx');
  const { RESOURCES, GUIDE_ARTICLES } = await vite.ssrLoadModule('/src/data/resources.js');
  const template = await fs.readFile(path.join(root, 'dist/index.html'), 'utf8');
  await fs.writeFile(path.join(root, 'dist/app.html'), template);
  const pages = [ ['/', 'Turn YouTube Lectures Into Perfect Study Notes', 'Transform accessible YouTube captions into structured notes, MCQs and 10-minute revision sheets in English, Hindi and Hinglish.'], ...Object.entries(RESOURCES).map(([slug, r]) => [`/${slug}`, r.keyword, r.description]), ['/guides', 'Practical study resources', 'Learn active recall, better lecture notes and calmer exam revision.'], ...GUIDE_ARTICLES.map(a => [`/guides/${a.slug}`, a.title, a.intro]), ['/help', 'Help & getting started', 'Get started with lecture notes, revision, MCQs and your private study workspace.'], ['/privacy', 'Privacy notice', 'How StudyMind handles account data, AI processing and local demo storage.'], ['/terms', 'Terms of use', 'Responsible use, educational limitations and account terms.'], ['/settings-integration', 'Integration & setup', 'Connect real authentication and live caption-grounded AI.'] ];
  for (const [url, title, description] of pages) {
    const content = renderPublicPage(url); if (!content) continue;
    const fullTitle = `${title} | StudyMind AI`;
    const schema = { '@context': 'https://schema.org', '@type': url.startsWith('/guides/') || RESOURCES[url.slice(1)] ? 'Article' : 'WebPage', headline: title, description, url: `${base}${url}`, inLanguage: 'en', isPartOf: { '@type': 'WebSite', name: 'StudyMind AI', url: base }, publisher: { '@type': 'Organization', name: 'StudyMind AI' } };
    const head = `<link rel="canonical" href="${escape(base + url)}" /><meta property="og:url" content="${escape(base + url)}" /><meta property="og:image" content="${escape(base + '/social-card.png')}" /><meta name="twitter:title" content="${escape(fullTitle)}" /><meta name="twitter:description" content="${escape(description)}" /><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
    const html = template.replace('<!-- SEO_HEAD -->', head).replace('<!-- APP_CONTENT -->', content).replace('<div id="root">', '<div id="root" data-prerendered="true">').replace(/<title>.*?<\/title>/, `<title>${escape(fullTitle)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(description)}">`).replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(fullTitle)}">`).replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(description)}">`);
    const file = url === '/' ? 'dist/index.html' : `dist${url}/index.html`;
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), html);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(([url]) => `<url><loc>${escape(base + url)}</loc><changefreq>${url === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${url === '/' ? '1.0' : '.7'}</priority></url>`).join('')}</urlset>`;
  await fs.writeFile(path.join(root, 'dist/sitemap.xml'), sitemap);
  await fs.writeFile(path.join(root, 'dist/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\nDisallow: /login\nDisallow: /register\nDisallow: /reset-password\nDisallow: /update-password\n\nSitemap: ${base}/sitemap.xml\n`);
  console.log(`Prerendered ${pages.length} search-friendly public pages. Sitemap base: ${base}`);
} finally { await vite.close(); }
