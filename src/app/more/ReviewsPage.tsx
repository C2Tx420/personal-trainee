import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { markReviewRead } from '@/data/api';
import { qk, useInvalidate, usePlans, useReviews } from '@/data/queries';
import { formatVN } from '@/engine/dates';
import { Badge, Button, Card, Empty, Page, Spinner } from '@/ui/components';

export function ReviewsPage() {
  const nav = useNavigate();
  const reviews = useReviews();
  const plans = usePlans();
  const invalidate = useInvalidate();
  const unread = (reviews.data ?? []).filter((r) => !r.is_read).map((r) => r.id).join();

  // mở trang = đã đọc
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => {
      void Promise.all(unread.split(',').map(markReviewRead)).then(() => invalidate(qk.reviews));
    }, 1500);
    return () => clearTimeout(t);
  }, [unread, invalidate]);

  if (reviews.isLoading) return <Page title="Nhận xét coach" back="/more"><Spinner /></Page>;
  return (
    <Page title="Nhận xét coach" back="/more">
      <p className="mb-3 text-xs text-muted">Claude Code viết sau mỗi lần review đầu tuần. Đề xuất thay đổi (nếu có) nằm ở draft lộ trình — anh duyệt mới có hiệu lực.</p>
      {(reviews.data ?? []).length === 0 && <Empty>Chưa có nhận xét nào. Review đầu tiên: 10:00 thứ Hai 02/11.</Empty>}
      {(reviews.data ?? []).map((r) => {
        const pv = plans.data?.find((p) => p.id === r.plan_version_id);
        return (
          <Card key={r.id}>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Tuần {formatVN(r.week_start, true)}</div>
              {!r.is_read && <Badge tone="info">mới</Badge>}
            </div>
            <div className="text-sm whitespace-pre-wrap">{r.content}</div>
            {pv && (
              <Button size="sm" className="mt-3" onClick={() => nav(`/more/plans/${pv.id}`)}>
                Xem lộ trình v{pv.version_no} ›
              </Button>
            )}
          </Card>
        );
      })}
    </Page>
  );
}
