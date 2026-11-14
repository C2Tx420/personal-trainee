import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { markReviewRead, type PlanVersion, type ReviewNote } from '@/data/api';
import { qk, useInvalidate, usePlans, useReviews } from '@/data/queries';
import { formatVN } from '@/engine/dates';
import { parseReviewNote, type ReviewSection, type ReviewSectionKey } from '@/engine/review-note';
import { getLocale, t } from '@/i18n';
import { Badge, Button, Card, Empty, Page, Skeleton } from '@/ui/components';
import { inlineTitle, NoteLines, RichText, StatusBadge, usePlanLabels } from './plan-ui';

const ICON: Record<ReviewSectionKey, string> = {
  weight: '⚖️', body: '📏', training: '🏋️', inbody: '🧬', library: '📚', proposal: '🗓️', questions: '❓', other: '•',
};

// English headings for the coach's sections; Vietnamese shows the coach's own wording
const SECTION_LABEL: Record<Exclude<ReviewSectionKey, 'other'>, string> = {
  weight: t('Cân nặng'),
  body: t('Số đo'),
  training: t('Tập luyện'),
  inbody: 'InBody',
  library: t('Thư viện bài tập'),
  proposal: t('Đề xuất'),
  questions: t('Câu hỏi cho anh'),
};

const sectionLabel = (s: ReviewSection) => (getLocale() === 'en' && s.key !== 'other' ? SECTION_LABEL[s.key] : s.label);

export function ReviewsPage() {
  const reviews = useReviews();
  const plans = usePlans();
  const labels = usePlanLabels();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState<string | null>(null);
  const list = reviews.data ?? [];
  const unread = list.filter((r) => !r.is_read).map((r) => r.id).join();

  // opening the page = read
  useEffect(() => {
    if (!unread) return;
    const timer = setTimeout(() => {
      void Promise.all(unread.split(',').map(markReviewRead)).then(() => invalidate(qk.reviews));
    }, 1500);
    return () => clearTimeout(timer);
  }, [unread, invalidate]);

  if (reviews.isLoading || labels.loading) return <Page title={t('Nhận xét coach')} back="/more"><Skeleton /></Page>;
  return (
    <Page title={t('Nhận xét coach')} back="/more">
      <p className="mb-3 px-1 text-xs text-muted">{t('Claude Code review mỗi thứ Hai sau khi anh cân. Thay đổi (nếu có) nằm ở lộ trình tuần mới — anh duyệt mới có hiệu lực.')}</p>
      {list.length === 0 && <Empty>{t('Chưa có nhận xét nào. Review mỗi thứ Hai, sau khi cân buổi sáng.')}</Empty>}
      {list.map((r, i) => (
        <ReviewCard
          key={r.id}
          r={r}
          expanded={open === null ? i === 0 : open === r.id}
          onToggle={() => setOpen(open === r.id || (open === null && i === 0) ? '' : r.id)}
          plan={plans.data?.find((p) => p.id === r.plan_version_id)}
          labels={labels}
        />
      ))}
    </Page>
  );
}

function ReviewCard({
  r, expanded, onToggle, plan, labels,
}: {
  r: ReviewNote;
  expanded: boolean;
  onToggle: () => void;
  plan: PlanVersion | undefined;
  labels: ReturnType<typeof usePlanLabels>;
}) {
  const nav = useNavigate();
  const note = parseReviewNote(r.content);
  const week = labels.review(r.week_start);
  const planLabel = labels.label(plan?.id);
  const questions = note.sections.filter((s) => s.key === 'questions');
  const rest = note.sections.filter((s) => s.key !== 'questions');
  const summary = note.summary.join(' ');
  const preview = summary || rest[0]?.lines[0]?.text;

  return (
    <Card>
      <button type="button" className="flex w-full items-start gap-2 text-left" onClick={onToggle} aria-expanded={expanded}>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{week ? t('Review {week}', { week: inlineTitle(week.title) }) : t('Review tuần {date}', { date: formatVN(r.week_start) })}</span>
          <span className="block text-xs text-muted">{week?.sub ?? formatVN(r.week_start, true)} · {t('viết {date}', { date: formatVN(r.created_at.slice(0, 10)) })}</span>
        </span>
        {!r.is_read && <Badge tone="info">{t('mới')}</Badge>}
        <span className="text-sm text-muted">{expanded ? '▴' : '▾'}</span>
      </button>

      {!expanded && preview && (
        <p className="mt-2 line-clamp-2 text-sm text-muted"><RichText text={preview} /></p>
      )}

      {expanded && (
        <>
          {summary && <p className="mt-2 text-[15px] leading-snug font-medium"><RichText text={summary} /></p>}
          <div className="mt-3 space-y-3">
            {rest.map((s, i) => <Section key={i} s={s} />)}
          </div>
          {questions.map((q, i) => (
            <div key={i} className="mt-3 rounded-lg border border-warn/25 bg-warn-soft p-3 text-sm">
              <div className="mb-1 font-semibold text-warn">{ICON.questions} {sectionLabel(q)}</div>
              <NoteLines lines={q.lines} />
            </div>
          ))}
          {plan && (
            <Button size="sm" className="mt-3 w-full justify-between" onClick={() => nav(`/more/plans/${plan.id}`)}>
              <span>{planLabel ? t('Xem lộ trình {plan}', { plan: inlineTitle(planLabel.title) }) : `${t('Xem lộ trình')} `}</span>
              <StatusBadge status={plan.status} />
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function Section({ s }: { s: ReviewSection }) {
  return (
    <div className="flex gap-2.5 text-sm">
      <span aria-hidden className="w-5 shrink-0 text-center">{ICON[s.key]}</span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{sectionLabel(s)}</div>
        <NoteLines lines={s.lines} />
      </div>
    </div>
  );
}
