import { supabase } from './supabase';
import { DEMO_NOTES, DEMO_FOLDERS, DEMO_PROFILE } from '../data/demo';
const PREFIX = 'studymind-demo-v1:';
export function readLocal(key, fallback) { try { const value = localStorage.getItem(PREFIX + key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
export function writeLocal(key, value) { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
export function initialDemo() {
  return { notes: readLocal('notes', structuredClone(DEMO_NOTES)), folders: readLocal('folders', DEMO_FOLDERS), attempts: readLocal('attempts', []), activities: readLocal('activities', []), chats: readLocal('chats', []), profile: readLocal('profile', DEMO_PROFILE) };
}
export async function loadRemote(userId) {
  const queries = [ ['notes', supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false })], ['folders', supabase.from('folders').select('*').eq('user_id', userId).order('created_at')], ['attempts', supabase.from('quiz_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200)], ['activities', supabase.from('study_activity').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500)], ['chats', supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at').limit(1000)], ['profile', supabase.from('profiles').select('*').eq('id', userId).single()] ];
  const results = await Promise.all(queries.map(([, q]) => q));
  const failed = results.find(r => r.error); if (failed) throw new Error(`Could not load your workspace. Check that the Supabase schema is installed. ${failed.error.message}`);
  const data = Object.fromEntries(results.map((r, i) => [queries[i][0], r.data]));
  return { ...data, notes: data.notes.map(fromRow), attempts: data.attempts.map(a => ({ ...a, id: a.id, noteId: a.note_id, noteTitle: a.note_title, createdAt: a.created_at })), activities: data.activities.map(a => ({ ...a, createdAt: a.created_at })), chats: data.chats.map(m => ({ ...m, noteId: m.note_id, createdAt: m.created_at })), profile: { ...data.profile, dailyGoal: data.profile.daily_goal } };
}
export function fromRow(row) { return { ...row.content, id: row.id, title: row.title, subject: row.subject, language: row.language, format: row.format, source: row.source, videoId: row.video?.videoId || '', videoUrl: row.video?.videoUrl || '', channel: row.video?.channel || '', duration: typeof row.video?.duration === 'number' ? `${Math.floor(row.video.duration / 60)}:${String(row.video.duration % 60).padStart(2, '0')}` : row.video?.duration || '', folderId: row.folder_id, bookmarked: row.bookmarked, revisionProgress: row.revision_progress, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function toRow(note, userId) {
  const { id, title, subject, language, format, source, videoId, videoUrl, channel, duration, folderId, bookmarked, revisionProgress, createdAt, updatedAt, ...content } = note;
  const durationSeconds = typeof duration === 'string' && duration.includes(':') ? duration.split(':').reduce((a, b) => a * 60 + Number(b), 0) : duration;
  return { id, user_id: userId, title, subject, language, format, source: source === 'demo' ? 'imported' : source, video: { videoId, videoUrl, channel, duration: durationSeconds }, content, folder_id: folderId || null, bookmarked: !!bookmarked, revision_progress: revisionProgress || 0, updated_at: new Date().toISOString() };
}
export async function persistRecord(kind, value, userId, demo, previous = null) {
  if (demo) { writeLocal(kind, value); return; }
  const tables = { notes: 'notes', folders: 'folders', attempts: 'quiz_attempts', activities: 'study_activity', chats: 'chat_messages' };
  let row = value;
  if (kind === 'notes') row = toRow(value, userId);
  else if (kind === 'folders') row = { ...value, user_id: userId };
  else if (kind === 'attempts') row = { id: value.id, user_id: userId, note_id: /^[0-9a-f-]{36}$/i.test(value.noteId || '') ? value.noteId : null, note_title: value.noteTitle, answers: value.answers, score: value.score, total: value.total };
  else if (kind === 'activities') row = { id: value.id, user_id: userId, kind: value.kind, minutes: value.minutes };
  else if (kind === 'chats') row = { id: value.id, user_id: userId, note_id: value.noteId, role: value.role, content: value.content };
  const query = previous ? supabase.from(tables[kind]).update(row).eq('id', value.id).eq(kind === 'folders' || kind === 'notes' || kind === 'attempts' || kind === 'activities' || kind === 'chats' ? 'user_id' : 'id', userId) : supabase.from(tables[kind]).insert(row);
  const { error } = await query; if (error) throw new Error(error.message);
}
export async function removeRecord(kind, id, userId, demo, remaining) {
  if (demo) { writeLocal(kind, remaining); return; }
  const tables = { notes: 'notes', folders: 'folders', chats: 'chat_messages' };
  const { error } = await supabase.from(tables[kind]).delete().eq('id', id).eq('user_id', userId); if (error) throw new Error(error.message);
}
