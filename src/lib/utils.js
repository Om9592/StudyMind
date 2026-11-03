export const cx = (...values) => values.filter(Boolean).join(' ');
export const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function formatDate(value) { return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
export function relativeDate(value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days} days ago`;
  return formatDate(value);
}
export function timestamp(seconds = 0) { const n = Math.max(0, Math.floor(Number(seconds) || 0)); return `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`; }
export function youtubeId(value) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'youtube-nocookie.com'].includes(host)) {
      id = url.searchParams.get('v') || '';
      if (!id && /^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}
export function flattenNotes(note) {
  return [note.title, note.summary, ...note.topics.map(t => `${t.title}\n${t.content}`), ...note.definitions.map(d => `${d.term}: ${d.definition}`), ...note.facts, ...note.formulas, ...note.takeaways, ...note.questions.map(q => `${q.question}\n${q.answer}`), ...(note.revision?.tricks || [])].join('\n\n');
}
export function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function getStreak(activities) {
  const dates = new Set(activities.map(a => new Date(a.createdAt || a.created_at).toLocaleDateString('en-CA')));
  let streak = 0; const date = new Date();
  if (!dates.has(date.toLocaleDateString('en-CA'))) date.setDate(date.getDate() - 1);
  while (dates.has(date.toLocaleDateString('en-CA'))) { streak++; date.setDate(date.getDate() - 1); }
  return streak;
}
