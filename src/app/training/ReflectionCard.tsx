import { useState } from 'react';
import { saveReflection } from '@/data/api';
import { qk, useInvalidate } from '@/data/queries';
import type { SessionRow } from '@/engine/types';
import { Button, Card, ErrorBox, TextArea } from '@/ui/components';

export const REFLECTION_PLACEHOLDER = 'Hôm nay thấy thế nào? Khoẻ / mệt, ngủ, ăn, chỗ nào đau, bài nào thích…';

/** "Cảm nhận sau buổi" on the session detail: editable until the week is reviewed, then read-only. */
export function ReflectionCard({ session, locked }: { session: SessionRow; locked: boolean }) {
  const invalidate = useInvalidate();
  const saved = session.reflection ?? '';
  const [text, setText] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const dirty = text.trim() !== saved.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveReflection(session.id, text.trim() || null);
      await invalidate(qk.session(session.id), qk.training);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-2 font-semibold">Cảm nhận sau buổi</div>
      <TextArea
        aria-label="Cảm nhận sau buổi"
        rows={3}
        maxLength={2000}
        disabled={locked}
        className={locked ? 'opacity-60' : undefined}
        placeholder={locked ? 'Không ghi cảm nhận' : REFLECTION_PLACEHOLDER}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="mt-1 text-xs text-muted">
        {locked ? 'Tuần này coach đã review — không ghi / sửa cảm nhận được nữa.' : 'Coach đọc khi review tuần. Ghi bù hoặc sửa được đến khi tuần đó được review.'}
      </p>
      {error ? <ErrorBox error={error} /> : null}
      {!locked && dirty && (
        <Button variant="primary" block className="mt-2" disabled={saving} onClick={() => void save()}>
          {saving ? 'Đang lưu…' : 'Lưu cảm nhận'}
        </Button>
      )}
    </Card>
  );
}
