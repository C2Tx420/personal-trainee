import { useState } from 'react';
import { usePhotos } from '@/data/queries';
import { formatVN } from '@/engine/dates';
import { Chip, Empty, Page, Segmented, Spinner } from '@/ui/components';
import { PhotoThumb } from './PhotoThumb';

/** Compare 2 dates at the same angle: side by side or an overlay slider. */
export function PhotoComparePage() {
  const photos = usePhotos();
  const [angle, setAngle] = useState<'front' | 'side' | 'back'>('front');
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [pos, setPos] = useState(50);

  if (photos.isLoading) return <Page title="So sánh ảnh" back="/body/photos"><Spinner /></Page>;
  const list = photos.data ?? [];
  const dates = [...new Set(list.map((p) => p.taken_on))].sort();
  const dA = a ?? dates[0];
  const dB = b ?? dates.at(-1);
  const pa = list.find((p) => p.taken_on === dA && p.angle === angle);
  const pb = list.find((p) => p.taken_on === dB && p.angle === angle);

  return (
    <Page title="So sánh ảnh" back="/body/photos">
      {dates.length === 0 ? (
        <Empty>Chưa có ảnh</Empty>
      ) : (
        <>
          <Segmented value={angle} onChange={setAngle} options={[{ value: 'front', label: 'Chính diện' }, { value: 'side', label: 'Nghiêng' }, { value: 'back', label: 'Lưng' }]} />
          <Segmented value={mode} onChange={setMode} options={[{ value: 'side', label: 'Cạnh nhau' }, { value: 'slider', label: 'Trượt' }]} />
          <div className="mb-2 text-sm text-muted">Ngày trước</div>
          <div className="mb-2 flex flex-wrap gap-2">{dates.map((d) => <Chip key={d} active={d === dA} onClick={() => setA(d)}>{formatVN(d)}</Chip>)}</div>
          <div className="mb-2 text-sm text-muted">Ngày sau</div>
          <div className="mb-3 flex flex-wrap gap-2">{dates.map((d) => <Chip key={d} active={d === dB} onClick={() => setB(d)}>{formatVN(d)}</Chip>)}</div>
          {mode === 'side' ? (
            <div className="grid grid-cols-2 gap-2">
              <div><PhotoThumb photo={pa} /><div className="mt-1 text-center text-xs">{dA && formatVN(dA, true)}</div></div>
              <div><PhotoThumb photo={pb} /><div className="mt-1 text-center text-xs">{dB && formatVN(dB, true)}</div></div>
            </div>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-xl">
                <PhotoThumb photo={pb} />
                <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                  <PhotoThumb photo={pa} />
                </div>
                <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }} />
              </div>
              <input aria-label="Thanh trượt so sánh" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="mt-3 w-full accent-[var(--accent)]" />
              <div className="flex justify-between text-xs text-muted"><span>{dA && formatVN(dA, true)}</span><span>{dB && formatVN(dB, true)}</span></div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
