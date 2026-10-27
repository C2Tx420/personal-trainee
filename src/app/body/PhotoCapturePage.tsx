import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthGate';
import { photoObjectUrl, uploadPhoto } from '@/data/api';
import { qk, useInvalidate, usePhotos } from '@/data/queries';
import { todayVN } from '@/engine/dates';
import { Banner, Button, Page } from '@/ui/components';
import { prepareImage } from './image-pipeline';

const ANGLES = [
  { key: 'front', label: 'Chính diện' },
  { key: 'side', label: 'Nghiêng' },
  { key: 'back', label: 'Lưng' },
] as const;
type Angle = (typeof ANGLES)[number]['key'];

/** Khung người hướng dẫn chồng lên camera. */
function Silhouette({ angle }: { angle: Angle }) {
  return (
    <svg viewBox="0 0 100 160" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <g fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.2" strokeDasharray="3 2">
        {angle === 'side' ? (
          <path d="M50 14a8 8 0 1 1 0 16a8 8 0 1 1 0-16M50 30v8c6 3 8 10 8 20v26c0 8-3 10-4 22l-2 44M50 38c-5 3-7 12-7 24v30l2 30-1 32" />
        ) : (
          <path d="M50 12a9 9 0 1 1 0 18a9 9 0 1 1 0-18M50 30v6M32 40h36M32 40l-6 40-2 24M68 40l6 40 2 24M36 42v46l-2 66M64 42v46l2 66M38 88h24" />
        )}
        <path d="M10 150h80" strokeDasharray="1 3" />
      </g>
    </svg>
  );
}

export function PhotoCapturePage() {
  const nav = useNavigate();
  const { userId } = useAuth();
  const invalidate = useInvalidate();
  const photos = usePhotos();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Angle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const angle = ANGLES[step]?.key;
  const today = todayVN();

  // camera sau
  useEffect(() => {
    let s: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false })
      .then((st) => {
        s = st;
        setStream(st);
        if (videoRef.current) videoRef.current.srcObject = st;
      })
      .catch(() => setCamError('Không mở được camera — dùng nút chọn ảnh bên dưới'));
    return () => s?.getTracks().forEach((t) => t.stop());
  }, []);

  // ảnh mờ của lần trước cùng góc (ghost overlay)
  useEffect(() => {
    const prev = photos.data?.find((p) => p.angle === angle && p.taken_on !== today);
    let url: string | null = null;
    setGhost(null);
    if (prev) void photoObjectUrl(prev.storage_path).then((u) => { url = u; setGhost(u); }).catch(() => undefined);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [angle, photos.data, today]);

  async function handleBlob(blob: Blob) {
    if (!angle) return;
    setBusy(true);
    setError(null);
    try {
      const img = await prepareImage(blob);
      await uploadPhoto({ userId, date: today, angle, ...img });
      setDone((d) => [...d, angle]);
      await invalidate(qk.photos);
      if (step < ANGLES.length - 1) setStep(step + 1);
      else nav('/body/photos', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function shoot() {
    let n = 5;
    setCountdown(n);
    const t = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(t);
        setCountdown(null);
        const v = videoRef.current;
        if (!v) return;
        const c = document.createElement('canvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext('2d')!.drawImage(v, 0, 0);
        c.toBlob((b) => b && void handleBlob(b), 'image/jpeg', 0.95);
      }
    }, 1000);
  }

  return (
    <Page title={`Chụp ảnh · ${ANGLES[step]?.label ?? ''} (${step + 1}/3)`} back="/body/photos">
      <div className="mb-3 flex gap-2 text-sm">
        {ANGLES.map((a, i) => (
          <span key={a.key} className={`flex-1 rounded-lg py-1 text-center ${done.includes(a.key) ? 'bg-ok-soft text-ok' : i === step ? 'bg-accent-soft text-accent' : 'bg-card-2 text-muted'}`}>
            {done.includes(a.key) ? '✓ ' : ''}{a.label}
          </span>
        ))}
      </div>
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl bg-black">
        {stream && <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />}
        {ghost && <img src={ghost} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        {angle && <Silhouette angle={angle} />}
        {countdown !== null && <div className="absolute inset-0 grid place-items-center text-8xl font-bold text-white drop-shadow">{countdown}</div>}
        {!stream && <div className="absolute inset-x-0 bottom-3 text-center text-sm text-white/80">{camError ?? 'Đang mở camera…'}</div>}
      </div>
      <p className="mb-3 text-xs text-muted">
        Đứng vào khung, giữ cùng ánh sáng và khoảng cách như lần trước. Ảnh được xoá EXIF (GPS, thiết bị), nén còn 1080px và lưu riêng tư — chỉ anh xem được.
      </p>
      {error && <Banner tone="bad">{error}</Banner>}
      {stream && (
        <Button variant="primary" size="xl" block disabled={busy || countdown !== null} onClick={shoot}>
          {busy ? 'Đang xử lý…' : '📸 Chụp (đếm 5 giây)'}
        </Button>
      )}
      <Button block className="mt-2" disabled={busy} onClick={() => fileRef.current?.click()}>
        Chọn ảnh có sẵn
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="photo-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleBlob(f);
          e.target.value = '';
        }}
      />
    </Page>
  );
}
