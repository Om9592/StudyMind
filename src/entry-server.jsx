import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { RESOURCES, GUIDE_ARTICLES } from './data/resources';
export function renderPublicPage(url) {
  const allowed = new Set(['/', '/guides', '/help', '/privacy', '/terms', '/settings-integration', ...Object.keys(RESOURCES).map(s => '/' + s), ...GUIDE_ARTICLES.map(a => '/guides/' + a.slug)]);
  if (!allowed.has(url)) return null;
  return renderToString(<App Router={StaticRouter} routerProps={{ location: url }}/>);
}
