import { useState } from 'react';
import { skipScheduledDay } from '@/data/api';
import { qk, useInvalidate } from '@/data/queries';
import type { IsoDate } from '@/engine/dates';
import { SESSION_KIND_LABEL, type SessionKind } from '@/engine/schedule';
import { Button, Chip, ErrorBox, Field, Sheet, TextArea } from '@/ui/components';

const REASONS = ['Bận việc', 'Mệt / ốm', 'Đau / chấn thương'];
const EXTRA_REASONS: Partial<Record<SessionKind, string[]>> = {
  badminton: ['Không có sân / bạn chơi', 'Thời tiết'],
};

/** "Nghỉ buổi này": log the day's scheduled session / badminton as skipped, with a reason for the coach. */
export function SkipDaySheet({ kind, date, onClose }: { kind: SessionKind | null; date: IsoDate; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    try {
      const text = [reason, note.trim()].filter(Boolean).join(' — ');
      await skipScheduledDay({ date, kind, note: text || null });
      await invalidate(qk.training);
      setReason(null);
      setNote('');
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={kind !== null} onClose={onClose} title={`Nghỉ buổi ${kind ? SESSION_KIND_LABEL[kind] : ''}`}>
      <p className="mb-3 text-sm text-muted">Ghi lại lý do để coach biết buổi này nghỉ có chủ đích khi review tuần.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[...REASONS, ...((kind && EXTRA_REASONS[kind]) ?? [])].map((r) => (
          <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? null : r)}>{r}</Chip>
        ))}
      </div>
      <Field label="Ghi chú (tuỳ chọn)">
        <TextArea rows={2} value={note} placeholder="VD: tăng ca, bù vào CN" onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error ? <ErrorBox error={error} /> : null}
      <Button variant="primary" block disabled={busy} onClick={() => void save()}>
        {busy ? 'Đang lưu…' : 'Lưu — nghỉ buổi này'}
      </Button>
    </Sheet>
  );
}
