import { useState } from 'react';
import { useNavigate } from 'react-router';
import { qk, useActivePlan, useExerciseMaps, useInvalidate } from '@/data/queries';
import { formatVN, todayVN } from '@/engine/dates';
import { expandSets, type ParsedLog, parseQuickLog, suggestWarmup } from '@/engine/quick-log-parser';
import { SESSION_KIND_LABEL, SESSION_KINDS, type SessionKind } from '@/engine/schedule';
import { searchExercises } from '@/engine/substitutions';
import { Banner, Button, Card, ErrorBox, Field, Input, Page, TextArea } from '@/ui/components';
import { type EditorItem, newKey, SessionEditor } from './SessionEditor';
import { saveEditor } from './save-editor';

const PLACEHOLDER = `hôm nay pull full máy
warm up 10p đi bộ 3.5-5
kéo xô
2 set x 10 25kg
3 set x 10 35kg
face pull
3x15x12.5`;

/** ✎ Free-text quick log (§6.2a): type/paste notes → preview → save. */
export function QuickLogPage() {
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const ex = useExerciseMaps();
  const plan = useActivePlan();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedLog | null>(null);
  const [items, setItems] = useState<EditorItem[]>([]);
  const [kind, setKind] = useState<SessionKind>('push');
  const [date, setDate] = useState(todayVN());
  const [warmupMarked, setWarmupMarked] = useState<string[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  function parse() {
    const r = parseQuickLog(text, todayVN());
    setParsed(r);
    setDate(r.date);
    if (r.kind) setKind(r.kind);
    const suggested: string[] = [];
    setItems(
      r.exercises.map((e) => {
        const match = searchExercises(e.name, ex.list, 1)[0];
        const key = newKey();
        const sets = expandSets(e);
        if (suggestWarmup(e)) {
          suggested.push(key);
          const firstCount = e.sets[0].count;
          sets.forEach((s, i) => (s.warmup = i < firstCount));
        }
        return {
          key,
          rawName: e.name,
          pick: match ? { exercise: match } : null,
          templateItemPosition: null,
          note: e.note ?? '',
          sets: sets.map((s) => ({ key: newKey(), set_type: s.warmup ? 'warmup' : 'working', kg: s.kg, reps: s.reps, seconds: s.seconds })),
        };
      }),
    );
    setWarmupMarked(suggested);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const id = await saveEditor({
        date,
        kind,
        items,
        warmup: parsed?.warmup
          ? { cardio: { exercise: 'treadmill_walk', minutes: parsed.warmup.minutes, speed_kmh_min: parsed.warmup.speedMin, speed_kmh_max: parsed.warmup.speedMax, done: true }, mobility_done: null }
          : null,
        note: `Ghi nhanh:\n${text}`,
        content: plan.data?.content ?? null,
        planVersionId: date === todayVN() ? (plan.data?.id ?? null) : null,
      });
      await invalidate(qk.training, qk.exercises);
      nav(`/training/session/${id}`, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Ghi nhanh bằng chữ" back="/training">
      {!parsed ? (
        <>
          <p className="mb-2 text-sm text-muted">Gõ hoặc dán ghi chú buổi tập y như khi nhắn tin. App tự tách bài + hiệp, anh xem lại rồi mới lưu.</p>
          <TextArea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} aria-label="Ghi chú buổi tập" />
          <Button variant="primary" size="lg" block className="mt-3" disabled={!text.trim()} onClick={parse}>
            Tách thành bài + hiệp →
          </Button>
        </>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày">
                <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Loại buổi">
                <select className="h-11 w-full rounded-xl border border-line bg-card px-3" value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
                  {SESSION_KINDS.map((k) => (
                    <option key={k} value={k}>{SESSION_KIND_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="text-sm text-muted">
              {formatVN(date, true)} · {parsed.warmup ? `khởi động ${parsed.warmup.minutes}′${parsed.warmup.speedMin ? ` · ${String(parsed.warmup.speedMin).replace('.', ',')}–${parsed.warmup.speedMax} km/h` : ''}` : 'không ghi khởi động'}
            </div>
          </Card>
          {warmupMarked.length > 0 && (
            <Banner tone="info">
              Đã đánh dấu {warmupMarked.length === 1 ? 'hiệp nhẹ đầu' : 'các hiệp nhẹ đầu'} là <b>làm nóng</b> (mẫu 2 hiệp nhẹ + 3 hiệp nặng). Bấm vào nhãn hiệp để đổi.
            </Banner>
          )}
          {parsed.unparsed.length > 0 && <Banner tone="warn">Không hiểu: {parsed.unparsed.join(' · ')}</Banner>}
          <SessionEditor items={items} onChange={setItems} library={ex.list} />
          {error ? <ErrorBox error={error} /> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => setParsed(null)}>← Sửa chữ</Button>
            <Button variant="primary" disabled={busy || items.length === 0} onClick={() => void save()}>
              {busy ? 'Đang lưu…' : 'Lưu buổi tập'}
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}
