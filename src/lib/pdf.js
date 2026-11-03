import { timestamp } from './utils';

/** Render Unicode with the browser's text shaper, then package real PDF pages.
 * This avoids rasterizing the entire application and preserves Hindi ligatures.
 * PDFs are image-based for consistent typography across devices.
 */
export async function exportNotePDF(note, revision = false) {
  const { jsPDF } = await import('jspdf');
  await document.fonts.ready;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.setProperties({ title: note.title, subject: `${note.subject} study notes`, author: 'StudyMind AI', creator: 'StudyMind AI' });
  const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser does not support canvas PDF rendering.');
  const W = 1240, H = 1754, margin = 88, maxWidth = W - margin * 2;
  let y = 100, pages = 0;
  const font = '"DM Sans Variable", "Noto Sans Devanagari", sans-serif';
  const specs = {
    p: { size: 23, color: '#35473b', weight: 400, before: 0, after: 16 },
    h1: { size: 43, color: '#244b34', weight: 600, before: 6, after: 22 },
    h2: { size: 31, color: '#245b45', weight: 600, before: 25, after: 16 },
    h3: { size: 25, color: '#294b35', weight: 600, before: 15, after: 9 },
    eyebrow: { size: 17, color: '#698259', weight: 600, before: 0, after: 24 },
    meta: { size: 19, color: '#7a8973', weight: 400, before: 0, after: 17 },
    notice: { size: 17, color: '#8c7948', weight: 400, before: 5, after: 20 },
    form: { size: 26, color: '#245b45', weight: 500, before: 9, after: 15 },
    answer: { size: 22, color: '#245b45', weight: 600, before: 9, after: 8 }
  };
  if (revision) { for (const spec of Object.values(specs)) { spec.size = Math.round(spec.size * .84); spec.before *= .6; spec.after *= .65; } }
  function beginPage() {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#245b45'; ctx.fillRect(margin, 49, 43, 5);
    ctx.font = `500 15px ${font}`; ctx.fillStyle = '#8b9c7f'; ctx.textBaseline = 'top';
    ctx.fillText('STUDYMIND AI  /  ' + (revision ? 'QUICK REVISION' : 'STUDY NOTES'), margin + 56, 44);
    y = 102;
  }
  function finishPage() {
    ctx.strokeStyle = '#dfe8d8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(margin, H - 83); ctx.lineTo(W - margin, H - 83); ctx.stroke();
    ctx.font = `400 16px ${font}`; ctx.fillStyle = '#87957c'; ctx.textBaseline = 'top';
    ctx.fillText(note.source === 'demo' ? 'DEMO · Authored sample material · Not a video analysis' : 'Caption-grounded notes · Verify important facts with the source', margin, H - 62);
    ctx.textAlign = 'right'; ctx.fillText(String(pages + 1), W - margin, H - 62); ctx.textAlign = 'left';
    if (pages > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', .93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); pages++;
  }
  function wrap(text, size, weight) {
    ctx.font = `${weight} ${size}px ${font}`;
    const lines = [];
    for (const paragraph of String(text).split('\n')) {
      if (!paragraph) { lines.push(''); continue; }
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? line + ' ' + word : word;
        if (ctx.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
        if (line) lines.push(line);
        line = '';
        if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
        for (const char of word) { if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = ''; } line += char; }
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  function add(text, type = 'p') {
    const spec = specs[type] || specs.p; const lineHeight = Math.round(spec.size * 1.6);
    const lines = wrap(text, spec.size, spec.weight);
    if (type.startsWith('h') && y + spec.before + lineHeight * 2 > H - 120) { finishPage(); beginPage(); }
    y += spec.before;
    for (const line of lines) {
      if (y + lineHeight > H - 120) { finishPage(); beginPage(); }
      ctx.font = `${spec.weight} ${spec.size}px ${font}`; ctx.fillStyle = spec.color; ctx.textBaseline = 'top';
      if (line) ctx.fillText(line, margin, y);
      y += lineHeight;
    }
    y += spec.after;
    if (type === 'h2') { ctx.strokeStyle = '#e2eadb'; ctx.beginPath(); ctx.moveTo(margin, y - 6); ctx.lineTo(W - margin, y - 6); ctx.stroke(); }
  }
  beginPage();
  add(note.title, 'h1'); add(`${note.subject}  ·  ${note.language}  ·  ${note.format}`, 'meta');
  add(note.source === 'demo' ? 'DEMO — Author-written sample. This is not an AI analysis of a video.' : 'AI-generated from accessible captions. Verify important facts with your lecture.', 'notice');
  add(revision ? 'The big picture — essential excerpt' : 'Lecture summary', 'h2');
  add(revision && note.summary.length > 480 ? note.summary.slice(0, 477) + '…' : note.summary);
  if (revision) {
    add('Exam essentials', 'h2'); note.facts.slice(0, 3).forEach((f, i) => add(`${i + 1}. ${f}`));
    if (note.formulas.length) { add('Key formulas', 'h2'); note.formulas.slice(0, 2).forEach(f => add(f, 'form')); }
    add('Memory hooks', 'h2'); note.revision.tricks.slice(0, 3).forEach(t => add('• ' + t));
    add('Check your understanding', 'h2'); note.questions.slice(0, 1).forEach(q => { add(q.question, 'h3'); add(q.answer); });
    add('Recall before you go', 'h2'); note.revision.flashcards.slice(0, 2).forEach(f => add('• ' + f.front));
    if (y > H - 120) {
      // A compact second pass guarantees a genuinely one-page handout.
      pages = 0; pdf.deletePage(1); beginPage();
      const original = { ...specs.p }; specs.p.size = 18; specs.p.after = 8;
      for (const spec of Object.values(specs)) { spec.size = Math.round(spec.size * .85); spec.before = Math.min(spec.before, 8); spec.after = Math.min(spec.after, 8); }
      add(note.title, 'h1'); add('ONE-PAGE REVISION · ' + (note.source === 'demo' ? 'DEMO SAMPLE' : 'CAPTION-GROUNDED NOTES'), 'notice');
      add('Big picture', 'h2'); add(note.summary.slice(0, 320) + (note.summary.length > 320 ? '…' : ''));
      add('Essential facts', 'h2'); note.facts.slice(0, 2).forEach(f => add('• ' + f));
      add('Memory hooks', 'h2'); note.revision.tricks.slice(0, 2).forEach(t => add('• ' + t));
      add('Recall prompts', 'h2'); note.revision.flashcards.slice(0, 3).forEach(f => add('• ' + f.front));
      Object.assign(specs.p, original);
    }
  } else {
    add('Topic-wise notes', 'h2'); note.topics.forEach((t, i) => { add(`${i + 1}. ${t.title}${note.videoId ? ` [${timestamp(t.timestamp)}]` : ''}`, 'h3'); add(t.content); });
    add('Important definitions', 'h2'); note.definitions.forEach(d => { add(d.term, 'h3'); add(d.definition); });
    if (note.formulas.length) { add('Important formulas', 'h2'); note.formulas.forEach(f => add(f, 'form')); }
    add('Important facts', 'h2'); note.facts.forEach((f, i) => add(`${i + 1}. ${f}`));
    add('Key takeaways', 'h2'); note.takeaways.forEach(t => add('• ' + t));
    add('Questions & answers', 'h2'); note.questions.forEach((q, i) => { add(`${i + 1}. ${q.question}`, 'h3'); add(q.answer); });
    add('Practice MCQs', 'h2'); note.mcqs.forEach((q, i) => { add(`${i + 1}. ${q.question}`, 'h3'); q.options.forEach((o, j) => add(`${String.fromCharCode(65 + j)}. ${o}`)); add(`Correct: ${String.fromCharCode(65 + q.correctIndex)}`, 'answer'); add(q.explanation); });
    add('Quick recall flashcards', 'h2'); note.revision.flashcards.forEach(f => { add(f.front, 'h3'); add(f.back); });
  }
  finishPage();
  const safe = note.title.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 80) || 'StudyMind Notes';
  pdf.save(`${safe}${revision ? ' - One-page revision' : ''}.pdf`);
}
