import { fetchTranscript } from 'youtube-transcript';

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const clean = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
async function metadata(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { title: `Lecture ${videoId}`, channel: 'YouTube lecture' };
    const data = await response.json();
    return { title: clean(data.title).slice(0, 180), channel: clean(data.author_name).slice(0, 150) };
  } catch { return { title: `Lecture ${videoId}`, channel: 'YouTube lecture' }; }
}
function normalize(segments) {
  const result = segments.map(s => {
    // youtube-transcript's srv3 response exposes offsets in milliseconds; classic XML uses seconds.
    const rawOffset = Math.max(0, Number(s.offset) || 0);
    const rawDuration = Math.max(0, Number(s.duration) || 0);
    const milliseconds = s.timeUnit === 'ms' || rawDuration > 60;
    return { text: clean(s.text), offset: milliseconds ? rawOffset / 1000 : rawOffset, duration: milliseconds ? rawDuration / 1000 : rawDuration, lang: s.lang || '' };
  }).filter(s => s.text);
  if (result.length === 0) throw new ApiError(422, 'TRANSCRIPT_UNAVAILABLE', 'No usable captions were found for this lecture. Try a video with English or Hindi captions. StudyMind does not infer content from the title or audio.');
  const total = result.reduce((n, s) => n + s.text.length, 0);
  if (total < 80) throw new ApiError(422, 'TRANSCRIPT_TOO_SHORT', 'The available captions are too short to create reliable study notes. Please choose a full lecture with captions.');
  if (total > 65000) throw new ApiError(422, 'LECTURE_TOO_LONG', 'This lecture has more than 65,000 characters of captions. Please use a shorter lecture or an individual chapter so notes stay grounded and reliable.');
  return result;
}
export async function extractTranscript(videoId) {
  let lastError;
  for (const lang of ['en', 'hi', undefined]) {
    try {
      const segments = await fetchTranscript(videoId, lang ? { lang } : {});
      const normalized = normalize(segments);
      return { segments: normalized, meta: await metadata(videoId), transcriptLanguage: normalized[0]?.lang || lang || 'available caption language' };
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.code !== 'TRANSCRIPT_UNAVAILABLE') throw error;
    }
  }
  // A second, maintained InnerTube client handles some caption layouts the first client cannot.
  try {
    const { Innertube } = await import('youtubei.js');
    let youtube;
    if (process.env.YOUTUBE_PROXY_URL) {
      const { ProxyAgent } = await import('undici');
      const agent = new ProxyAgent(process.env.YOUTUBE_PROXY_URL);
      youtube = await Innertube.create({ fetch: (input, init = {}) => fetch(input, { ...init, dispatcher: agent }), generate_session_locally: true });
    } else youtube = await Innertube.create({ generate_session_locally: true });
    const info = await youtube.getInfo(videoId);
    const transcript = await info.getTranscript();
    const lines = transcript?.transcript?.content?.body?.initial_segments || [];
    const segments = normalize(lines.map(s => ({ text: s.snippet?.text || '', offset: Number(s.start_ms) / 1000, duration: (Number(s.end_ms) - Number(s.start_ms)) / 1000, lang: transcript.selectedLanguage })));
    const details = info.basic_info;
    return { segments, meta: { title: clean(details.title || `Lecture ${videoId}`).slice(0, 180), channel: clean(details.author || 'YouTube lecture'), duration: details.duration || 0 }, transcriptLanguage: transcript.selectedLanguage || 'Available captions' };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Caption extraction failed:', error?.message?.slice(0, 250));
    const message = String(lastError?.message || error?.message || '');
    if (/disabled|turn off captions/i.test(message)) throw new ApiError(422, 'CAPTIONS_DISABLED', 'Captions are disabled for this video. Ask the creator to enable captions, or choose another lecture. We cannot generate grounded notes without a transcript.');
    if (/too many|ip|blocked|captcha|sign in|429/i.test(message)) throw new ApiError(503, 'YOUTUBE_BLOCKED', 'YouTube is restricting transcript access from this server. Please try again later. The deployment owner can configure a compliant caption proxy; no video content has been analyzed.');
    throw new ApiError(422, 'TRANSCRIPT_UNAVAILABLE', 'This video is unavailable, private, or has no accessible English/Hindi captions. Check that it plays in your browser and has a transcript, then try another lecture.');
  }
}
export function transcriptText(segments) { return segments.map(s => `[${Math.floor(s.offset)}s] ${s.text}`).join('\n'); }
