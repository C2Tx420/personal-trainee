import { useState } from 'react';
import { useNavigate } from 'react-router';
import { deletePhoto, type PhotoRow } from '@/data/api';
import { qk, useInvalidate, usePhotos } from '@/data/queries';
import { diffDays, formatVN, todayVN } from '@/engine/dates';
import { t } from '@/i18n';
import { Banner, Button, Card, Empty, Page, Sheet, Skeleton } from '@/ui/components';
import { PhotoThumb } from './PhotoThumb';

const LABEL = { front: t('Chính diện'), side: t('Nghiêng'), back: t('Lưng') };

export function PhotosPage() {
  const nav = useNavigate();
  const photos = usePhotos();
  const invalidate = useInvalidate();
  const [del, setDel] = useState<PhotoRow | null>(null);

  if (photos.isLoading) return <Page title={t('Ảnh tiến độ')} back="/body"><Skeleton /></Page>;
  const list = photos.data ?? [];
  const dates = [...new Set(list.map((p) => p.taken_on))];
  const last = dates[0];
  const due = !last || diffDays(last, todayVN()) >= 14;

  return (
    <Page title={t('Ảnh tiến độ')} back="/body">
      <p className="mb-3 text-xs text-muted">{t('Chỉ anh xem được. Không đưa vào báo cáo coach, không sao lưu mặc định, không chia sẻ.')}</p>
      {due && <Banner tone="info">{last ? t('Đã {n} ngày từ lần chụp trước — đến lượt chụp', { n: diffDays(last, todayVN()) }) : t('Chưa có ảnh nào — chụp bộ đầu tiên')}</Banner>}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => nav('/body/photos/capture')}>{t('Chụp bộ mới')}</Button>
        <Button disabled={dates.length < 1} onClick={() => nav('/body/photos/compare')}>{t('So sánh')}</Button>
      </div>
      {dates.length === 0 && <Empty>{t('Chưa có ảnh')}</Empty>}
      {dates.map((d) => (
        <Card key={d}>
          <div className="mb-2 font-semibold">{formatVN(d, true)}</div>
          <div className="grid grid-cols-3 gap-2">
            {(['front', 'side', 'back'] as const).map((a) => {
              const p = list.find((x) => x.taken_on === d && x.angle === a);
              return (
                <div key={a}>
                  <PhotoThumb photo={p} />
                  <div className="mt-1 flex items-center justify-between text-xs text-muted">
                    {LABEL[a]}
                    {p && <button aria-label={t('Xoá ảnh {angle}', { angle: LABEL[a] })} onClick={() => setDel(p)}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <Sheet open={!!del} onClose={() => setDel(null)} title={t('Xoá ảnh này?')}>
        <p className="mb-3 text-sm text-muted">{t('Xoá khỏi Storage và lịch sử. Không hoàn tác được.')}</p>
        <Button
          variant="danger"
          size="lg"
          block
          onClick={async () => {
            await deletePhoto(del!);
            setDel(null);
            await invalidate(qk.photos);
          }}
        >
          {t('Xoá ảnh')}
        </Button>
      </Sheet>
    </Page>
  );
}
