import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId, notesSchema, generateSchema, chatSchema } from '../server/lib/validation.js';
import { DEMO_NOTES } from '../src/data/demo.js';
import { youtubeId, timestamp } from '../src/lib/utils.js';
import { createApp } from '../server/app.js';

test('accepts standard, short, mobile, shorts and embed YouTube URLs', () => {
  for (const url of ['https://www.youtube.com/watch?v=jNQXAC9IVRw', 'https://youtu.be/jNQXAC9IVRw?t=10', 'https://m.youtube.com/watch?v=jNQXAC9IVRw', 'https://youtube.com/shorts/jNQXAC9IVRw', 'https://www.youtube-nocookie.com/embed/jNQXAC9IVRw']) { assert.equal(parseYouTubeId(url), 'jNQXAC9IVRw'); assert.equal(youtubeId(url), 'jNQXAC9IVRw'); }
});
test('rejects malicious, arbitrary, playlist-only and invalid video URLs', () => {
  for (const url of ['https://youtube.com.evil.example/watch?v=jNQXAC9IVRw', 'https://evil.example/?u=youtube.com/v=jNQXAC9IVRw', 'javascript:alert(1)', 'https://youtube.com/playlist?list=abc', 'https://youtu.be/short', 'not a url', 'ftp://youtu.be/jNQXAC9IVRw']) { assert.equal(parseYouTubeId(url), null); assert.equal(youtubeId(url), null); }
});
test('all demo study sets satisfy the live AI output schema', () => { for (const note of DEMO_NOTES) { const parsed = notesSchema.parse(note); assert.equal(parsed.mcqs.length, note.mcqs.length); for (const q of parsed.mcqs) { assert.equal(q.options.length, 4); assert.ok(q.correctIndex >= 0 && q.correctIndex < 4); } } });
test('rejects invalid language, format and extra video IDs', () => { assert.equal(generateSchema.safeParse({ videoId: 'jNQXAC9IVRw', language: 'Klingon', format: 'Detailed' }).success, false); assert.equal(generateSchema.safeParse({ videoId: 'bad', language: 'Hindi', format: 'Short' }).success, false); });
test('chat requires a UUID and nonempty bounded message', () => { assert.equal(chatSchema.safeParse({ noteId: 'demo-biology', message: 'Hi' }).success, false); assert.equal(chatSchema.safeParse({ noteId: crypto.randomUUID(), message: ' ' }).success, false); assert.equal(chatSchema.safeParse({ noteId: crypto.randomUUID(), message: 'a'.repeat(2001) }).success, false); });
test('timestamp formatting', () => { assert.equal(timestamp(0), '00:00'); assert.equal(timestamp(65.9), '01:05'); assert.equal(timestamp(-1), '00:00'); });

test('API health and protected routes', async t => {
  const old = { ...process.env };
  delete process.env.OPENAI_API_KEY; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY;
  const app = createApp(); const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  t.after(async () => { await new Promise(r => server.close(r)); for (const k of ['OPENAI_API_KEY','SUPABASE_URL','SUPABASE_ANON_KEY']) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k]; } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200); assert.equal((await health.json()).mode, 'demo');
  for (const path of ['transcript','generate','chat','quiz']) { const r = await fetch(base + '/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(r.status, 503); assert.equal((await r.json()).code, 'DEMO_MODE'); }
  const missing = await fetch(base + '/api/unknown'); assert.equal(missing.status, 404);
});
