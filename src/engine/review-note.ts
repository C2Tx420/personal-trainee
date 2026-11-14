/**
 * Coach review note (markdown written by Claude Code, coach/CLAUDE.md) → blocks for the app.
 *
 *   Một câu tóm tắt.                      ← summary (lines before the first section)
 *   **Cân**: 80,0 kg (−0,4) · …           ← section, text after ":" on the same line
 *   - ✓ kéo xô 35kg đủ 3×10               ← bullet in that section
 *   **Cần anh trả lời**:
 *   - Máy hack squat …?
 */
export type ReviewSectionKey = 'weight' | 'body' | 'training' | 'inbody' | 'library' | 'proposal' | 'questions' | 'other';

export type ReviewLine = { kind: 'text' | 'bullet'; text: string; tone?: 'good' | 'warn' };

export type ReviewSection = { key: ReviewSectionKey; label: string; lines: ReviewLine[] };

export type ParsedReview = { summary: string[]; sections: ReviewSection[] };

const KEYS: [RegExp, ReviewSectionKey][] = [
  [/^(tiến độ )?cân/i, 'weight'], // i18n-ignore: matches labels in the coach note
  [/^số đo/i, 'body'], // i18n-ignore: matches labels in the coach note
  [/^tập/i, 'training'], // i18n-ignore: matches labels in the coach note
  [/^inbody/i, 'inbody'],
  [/^(bài tạm|thư viện)/i, 'library'], // i18n-ignore: matches labels in the coach note
  [/^(đề xuất|lộ trình)/i, 'proposal'], // i18n-ignore: matches labels in the coach note
  [/^(cần anh|câu hỏi|hỏi anh)/i, 'questions'], // i18n-ignore: matches labels in the coach note
];

export function sectionKey(label: string): ReviewSectionKey {
  return KEYS.find(([re]) => re.test(label.trim()))?.[1] ?? 'other';
}

function line(kind: ReviewLine['kind'], raw: string): ReviewLine {
  const m = /^(✓|✅|⚠️?|❗)\s*/u.exec(raw);
  if (!m) return { kind, text: raw };
  return { kind, text: raw.slice(m[0].length), tone: m[1] === '✓' || m[1] === '✅' ? 'good' : 'warn' };
}

export function parseReviewNote(md: string): ParsedReview {
  const summary: string[] = [];
  const sections: ReviewSection[] = [];
  for (const raw of md.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) continue;
    // "**Cân**: …", "**Cân:** …", "**Cân**" alone, or "## Cân"
    const head = /^\*\*([^*]+?):?\*\*\s*:?\s*(.*)$/.exec(t) ?? /^#{1,4}\s+(.+?):?()$/.exec(t);
    if (head && (t.startsWith('#') || /^\*\*[^*]+?(:\*\*|\*\*\s*:)/.test(t) || !head[2])) {
      const label = head[1].trim();
      const s: ReviewSection = { key: sectionKey(label), label, lines: [] };
      if (head[2]) s.lines.push(line('text', head[2]));
      sections.push(s);
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(t);
    const cur = sections.at(-1);
    if (!cur) summary.push(bullet ? bullet[1] : t);
    else cur.lines.push(line(bullet ? 'bullet' : 'text', bullet ? bullet[1] : t));
  }
  return { summary, sections };
}

/** "a **b** c" → [{text:'a '}, {text:'b', bold:true}, {text:' c'}] */
export function inlineBold(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false },
  );
}
