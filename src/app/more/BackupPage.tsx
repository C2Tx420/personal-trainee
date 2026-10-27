import { useState } from 'react';
import { qk, useInvalidate } from '@/data/queries';
import { todayVN } from '@/engine/dates';
import { BACKUP_TABLES, buildBackup, planImport } from '@/export/backup';
import { must, supabase } from '@/lib/supabase';
import { APP_VERSION } from '@/lib/version';
import { Banner, Button, Card, Page } from '@/ui/components';

async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export function BackupPage() {
  const invalidate = useInvalidate();
  const [withPhotos, setWithPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad' | 'info'; text: string } | null>(null);
  const [pending, setPending] = useState<unknown>(null);

  async function exportJson() {
    setBusy(true);
    try {
      const tables: Record<string, Record<string, unknown>[]> = {};
      for (const t of BACKUP_TABLES) tables[t] = must(await supabase.from(t).select('*')) as Record<string, unknown>[];
      const backup = buildBackup(tables, APP_VERSION);
      if (withPhotos) {
        backup.photos = [];
        for (const p of tables.progress_photos as { storage_path: string }[]) {
          const { data } = await supabase.storage.from('progress-photos').download(p.storage_path);
          if (data) backup.photos.push({ path: p.storage_path, base64: await blobToBase64(data) });
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pt-backup-${todayVN()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      const total = Object.values(tables).reduce((n, r) => n + r.length, 0);
      setMsg({ tone: 'ok', text: `Đã xuất ${total} dòng${withPhotos ? ` + ${backup.photos?.length ?? 0} ảnh` : ''}` });
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function onFile(f: File) {
    try {
      const raw = JSON.parse(await f.text());
      const { counts, skipped } = planImport(raw);
      setPending(raw);
      setMsg({
        tone: 'info',
        text: `Chạy thử: ${Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${t} ${n}`).join(' · ')}${skipped.length ? ` · bỏ qua (chỉ đọc): ${skipped.join(', ')}` : ''}`,
      });
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message });
    }
  }

  async function runImport() {
    setBusy(true);
    try {
      const { plan } = planImport(pending);
      let n = 0;
      for (const step of plan) {
        if (!step.rows.length) continue;
        const pk = step.table === 'profiles' ? 'user_id' : 'id';
        must(await supabase.from(step.table).upsert(step.rows, { onConflict: pk }));
        n += step.rows.length;
      }
      await invalidate(qk.training, qk.weights, qk.measurements, qk.inbody, qk.plans, qk.activePlan, qk.exercises);
      setMsg({ tone: 'ok', text: `Đã nhập ${n} dòng` });
      setPending(null);
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Sao lưu" back="/more">
      <Card>
        <div className="mb-1 font-semibold">Xuất JSON</div>
        <p className="mb-3 text-sm text-muted">Toàn bộ dữ liệu (pt-backup/1), trừ PIN và thiết bị nhận thông báo. Ảnh tiến độ chỉ kèm nếu anh chọn.</p>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
          Kèm ảnh tiến độ (file sẽ lớn)
        </label>
        <Button variant="primary" block disabled={busy} onClick={() => void exportJson()}>Tải file sao lưu</Button>
      </Card>
      <Card>
        <div className="mb-1 font-semibold">Nhập JSON</div>
        <p className="mb-3 text-sm text-muted">Chọn file → app chạy thử (chỉ đếm) → bấm Nhập để ghi (upsert theo id, không nhân đôi).</p>
        <input type="file" accept="application/json" aria-label="Chọn file sao lưu" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
        {pending ? (
          <Button variant="primary" block className="mt-3" disabled={busy} onClick={() => void runImport()}>
            Nhập dữ liệu
          </Button>
        ) : null}
      </Card>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
    </Page>
  );
}
