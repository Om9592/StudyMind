import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = createApp();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist'), { index: false }));
  app.use((req, res) => res.sendFile(path.join(root, 'dist/app.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`StudyMind AI is ready at http://0.0.0.0:${port}`));
