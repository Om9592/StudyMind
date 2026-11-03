import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { extractTranscript, transcriptText, ApiError } from './lib/transcripts.js';
import { generateNotes, answerQuestion, generateQuiz } from './lib/ai.js';
import { generateSchema, chatSchema, quizSchema, parseYouTubeId } from './lib/validation.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', rateLimit({ windowMs: 60000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please wait a minute.', code: 'RATE_LIMIT' } }));
  const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.OPENAI_API_KEY);
  app.get('/api/health', (req, res) => res.json({ status: 'ok', liveAI: configured(), mode: configured() ? 'live' : 'demo', version: '1.0.0' }));
  app.get('/api/config', (req, res) => res.json({ liveAI: configured(), aiConfigured: Boolean(process.env.OPENAI_API_KEY), authConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) }));

  async function authenticate(req, res, next) {
    if (!configured()) throw new ApiError(503, 'DEMO_MODE', 'This deployment is in demo mode. Live AI requires server-side Supabase and OpenAI credentials. Demo samples are available in the app.');
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new ApiError(401, 'AUTH_REQUIRED', 'Please sign in to use live AI.');
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    req.user = user; req.db = client; next();
  }
  async function quota(req, action, hour, month) {
    const { data, error } = await req.db.rpc('consume_quota', { action_name: action, hourly_limit: hour, monthly_limit: month });
    if (error) throw new ApiError(503, 'DATABASE_SETUP', 'The database quota function is unavailable. Run the supplied Supabase schema before using live AI.');
    if (!data) throw new ApiError(429, 'USAGE_LIMIT', 'You have reached this feature’s hourly or monthly allowance. Your saved notes, quizzes and revision tools remain available.');
  }
  async function ownedNote(req, id) {
    const { data, error } = await req.db.from('notes').select('*').eq('id', id).eq('user_id', req.user.id).single();
    if (error || !data) throw new ApiError(404, 'NOTE_NOT_FOUND', 'This lecture was not found in your account.');
    return data;
  }
  app.post('/api/transcript', authenticate, async (req, res) => {
    const videoId = parseYouTubeId(req.body?.url);
    if (!videoId) throw new ApiError(400, 'INVALID_URL', 'Enter a valid YouTube video URL (youtube.com or youtu.be). Playlists and channel links are not supported.');
    const result = await extractTranscript(videoId);
    res.json({ videoId, ...result.meta, transcriptLanguage: result.transcriptLanguage, captionCharacters: result.segments.reduce((sum, s) => sum + s.text.length, 0), duration: result.meta.duration || Math.ceil(result.segments.at(-1).offset + result.segments.at(-1).duration) });
  });
  app.post('/api/generate', authenticate, async (req, res) => {
    const input = generateSchema.parse(req.body);
    await quota(req, 'generate', 5, 10);
    const extracted = await extractTranscript(input.videoId);
    const content = await generateNotes({ transcript: transcriptText(extracted.segments), language: input.language, format: input.format, title: extracted.meta.title });
    res.json({ content: { ...content, title: extracted.meta.title || content.title }, video: { videoId: input.videoId, videoUrl: `https://www.youtube.com/watch?v=${input.videoId}`, ...extracted.meta, transcriptLanguage: extracted.transcriptLanguage }, source: 'ai' });
  });
  app.post('/api/chat', authenticate, async (req, res) => {
    const input = chatSchema.parse(req.body);
    await quota(req, 'chat', 30, 200);
    const note = await ownedNote(req, input.noteId);
    const { data: history, error } = await req.db.from('chat_messages').select('role,content').eq('note_id', note.id).eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(8);
    if (error) throw new ApiError(500, 'DATABASE_ERROR', 'Could not load this lecture conversation.');
    const answer = await answerQuestion({ notes: note.content, history: (history || []).reverse(), message: input.message, language: note.language });
    const { error: saveError } = await req.db.from('chat_messages').insert([ { user_id: req.user.id, note_id: note.id, role: 'user', content: input.message }, { user_id: req.user.id, note_id: note.id, role: 'assistant', content: answer } ]);
    if (saveError) throw new ApiError(500, 'SAVE_FAILED', 'Your answer was generated but could not be saved. Please retry.');
    res.json({ answer, noteId: note.id });
  });
  app.post('/api/quiz', authenticate, async (req, res) => {
    const input = quizSchema.parse(req.body);
    await quota(req, 'quiz', 10, 30);
    const note = await ownedNote(req, input.noteId);
    const questions = await generateQuiz({ notes: note.content, count: input.count, language: note.language });
    res.json({ questions, noteId: note.id });
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.', code: 'NOT_FOUND' }));
  app.use((error, req, res, next) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Please check the submitted fields. ' + error.issues.map(i => `${i.path.join('.')}: ${i.message}`).slice(0, 2).join('; '), code: 'VALIDATION_ERROR' });
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'This request is too large.', code: 'REQUEST_TOO_LARGE' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON request.', code: 'INVALID_JSON' });
    console.error('Unhandled API error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
  });
  return app;
}
