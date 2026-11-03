import { z } from 'zod';
export const videoIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{11}$/);
const seconds = z.number().min(0).max(86400);
export const notesSchema = z.object({
  title: z.string().min(3).max(180), subject: z.enum(['Biology', 'Physics', 'Chemistry', 'Mathematics', 'History', 'General']),
  summary: z.string().min(30).max(6000),
  topics: z.array(z.object({ title: z.string().max(180), timestamp: seconds, content: z.string().max(12000) })).min(1).max(25),
  definitions: z.array(z.object({ term: z.string().max(180), definition: z.string().max(2000) })).max(30),
  facts: z.array(z.string().max(2000)).max(30), formulas: z.array(z.string().max(1000)).max(20), takeaways: z.array(z.string().max(2000)).max(20),
  questions: z.array(z.object({ question: z.string().max(2000), answer: z.string().max(4000) })).max(20),
  mcqs: z.array(z.object({ id: z.string().max(100), topic: z.string().max(180), question: z.string().max(2000), options: z.array(z.string().max(1000)).length(4), correctIndex: z.number().int().min(0).max(3), explanation: z.string().max(3000) })).min(3).max(20),
  revision: z.object({ tricks: z.array(z.string().max(2000)).max(15), flashcards: z.array(z.object({ front: z.string().max(1000), back: z.string().max(2000) })).max(20) })
});
export const generateSchema = z.object({ videoId: videoIdSchema, language: z.enum(['English', 'Hindi', 'Hinglish']), format: z.enum(['Detailed', 'Short', 'Exam-Oriented']) });
export const chatSchema = z.object({ noteId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });
export const quizSchema = z.object({ noteId: z.string().uuid(), count: z.number().int().min(3).max(15).default(10) });
export const revisionSchema = z.object({ noteId: z.string().uuid() });
export function parseYouTubeId(value) {
  try {
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
    let id = u.searchParams.get('v');
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (!['youtube.com', 'youtube-nocookie.com'].includes(host)) return null;
    else if (!id && /^\/(embed|shorts|live)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    const result = videoIdSchema.safeParse(id); return result.success ? result.data : null;
  } catch { return null; }
}
