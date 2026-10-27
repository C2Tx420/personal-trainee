import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { deleteSession, saveSet } from '@/data/api';
import { qk, useExerciseMaps, useInvalidate, useSessionDetail } from '@/data/queries';
import { formatVN, WEEKDAY_LABEL, weekdayOf } from '@/engine/dates';
import { formatSet } from '@/engine/progression';
import { SESSION_KIND_LABEL } from '@/engine/schedule';
import { FEEL_LABEL, KG_CHANGE_LABEL, type SetRow, SUBSTITUTION_LABEL } from '@/engine/types';
import { setLabel } from '@/engine/warmup';
import { sessionSummary } from '@/engine/workout-summary';
import { Badge, Banner, Button, Card, cx, ErrorBox, ExerciseImg, Page, Sheet, Spinner, Stat } from '@/ui/components';
import { fmtKg } from '../shared';
import { SetCard } from '../workout/SetCard';

/** Chi tiết buổi đã ghi: xem, sửa từng hiệp, xoá buổi. */
export function SessionDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const detail = useSessionDetail(id);
  const ex = useExerciseMaps();
  const [edit, setEdit] = useState<SetRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (detail.isLoading || ex.loading) return <Page title="Buổi tập" back="/training"><Spinner /></Page>;
  if (detail.error || !detail.data) return <Page title="Buổi tập" back="/training"><ErrorBox error={detail.error} /></Page>;
  const { session, items, sets } = detail.data;
  const sum = sessionSummary(session, items, sets, ex.byId);
  const w = session.warmup;
  const editItem = edit ? items.find((i) => i.id === edit.session_item_id) : null;

  return (
    <Page title={`${SESSION_KIND_LABEL[session.kind]} · ${formatVN(session.session_date)}`} back="/training">
      <p className="mb-3 text-sm text-muted">
        {WEEKDAY_LABEL[weekdayOf(session.session_date)]}, {formatVN(session.session_date, true)}
        {session.is_backfill && ' · ghi bù'}
        {session.note && !session.note.startsWith('Ghi nhanh') && ` · ${session.note}`}
      </p>
      {session.status === 'in_progress' && (
        <Banner tone="accent" onClick={() => nav(`/workout/${session.id}`)} action={<b>Tiếp tục ›</b>}>Buổi đang tập dở</Banner>
      )}

      {items.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Stat label="Bài" value={`${sum.itemsDone}/${sum.itemsTotal}`} />
          <Stat label="Hiệp chính" value={`${sum.workingSetsDone}/${sum.workingSetsPlanned}`} />
          <Stat label="Khối lượng" value={`${sum.volumeKg.toLocaleString('vi-VN')} kg`} sub={sum.missingKgExercises.length ? `${sum.missingKgExercises.length} bài không có số kg` : undefined} />
          <Stat label="Thời gian" value={sum.durationMin ? `${sum.durationMin} phút` : '—'} />
        </div>
      )}
      {session.kind === 'badminton' && (
        <Card>🏸 {session.duration_min} phút · cường độ {session.badminton_intensity === 'light' ? 'nhẹ' : session.badminton_intensity === 'moderate' ? 'vừa' : 'nặng'} · ≈ {session.est_kcal} kcal</Card>
      )}
      {w && (
        <Card>
          🔥 Khởi động:{' '}
          {w.skipped ? (
            <span className="text-warn">bỏ qua</span>
          ) : (
            <>
              {w.cardio ? `${ex.bySlug.get(w.cardio.exercise)?.name_vi ?? w.cardio.exercise} ${w.cardio.minutes}′` : ''}
              {w.cardio?.speed_kmh_min ? ` · ${String(w.cardio.speed_kmh_min).replace('.', ',')}–${w.cardio.speed_kmh_max} km/h` : ''}
              {w.mobility_done ? ' · khớp ✓' : ''}
            </>
          )}
        </Card>
      )}

      {items.map((it) => {
        const e = ex.byId.get(it.exercise_id);
        const planned = it.planned_exercise_id ? ex.byId.get(it.planned_exercise_id) : null;
        const s = sets.filter((x) => x.session_item_id === it.id).sort((a, b) => (a.set_type === b.set_type ? a.set_index - b.set_index : a.set_type === 'warmup' ? -1 : 1));
        return (
          <Card key={it.id}>
            <div className="mb-2 flex items-center gap-3">
              <ExerciseImg svg={e?.illustration_svg} name={e?.name_vi ?? ''} className="w-20 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{e?.name_vi}</div>
                {it.substitution_reason && (
                  <div className="text-xs text-info">⇄ thay {planned?.name_vi} · {SUBSTITUTION_LABEL[it.substitution_reason]}{it.substitution_note ? ` — ${it.substitution_note}` : ''}</div>
                )}
                {it.template_item_position === null && <Badge>ngoài kế hoạch</Badge>}
                {it.status === 'skipped' && <Badge tone="bad">bỏ{it.skip_reason ? `: ${it.skip_reason}` : ''}</Badge>}
                {it.note && <div className="text-xs text-muted">{it.note}</div>}
              </div>
            </div>
            <div className="divide-y divide-line">
              {s.map((x) => (
                <button key={x.id} onClick={() => setEdit(x)} className="tabular flex w-full items-center justify-between py-1.5 text-left text-sm">
                  <span className={cx(x.set_type === 'warmup' && 'text-muted')}>{setLabel({ setType: x.set_type, index: x.set_index })}</span>
                  <span className="flex items-center gap-2">
                    {x.kg_change_reason && (
                      <span className="text-xs text-warn">{fmtKg(x.target_kg)}→{fmtKg(x.weight_kg)} ({KG_CHANGE_LABEL[x.kg_change_reason]})</span>
                    )}
                    {x.feel && <Badge>{FEEL_LABEL[x.feel]}</Badge>}
                    <b>{formatSet(x)}</b>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}

      <Button variant="danger" block className="mt-4" onClick={() => setConfirmDelete(true)}>Xoá buổi này</Button>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Xoá buổi tập?">
        <p className="mb-3 text-sm text-muted">Xoá cả các bài và hiệp đã ghi của buổi này. Không hoàn tác được.</p>
        <Button
          variant="danger"
          size="lg"
          block
          onClick={async () => {
            await deleteSession(session.id);
            await invalidate(qk.training, qk.inProgress);
            nav('/training', { replace: true });
          }}
        >
          Xoá
        </Button>
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Sửa hiệp">
        {edit && editItem && ex.byId.get(editItem.exercise_id) && (
          <SetCard
            item={editItem}
            exercise={ex.byId.get(editItem.exercise_id)!}
            planned={{ setType: edit.set_type, index: edit.set_index, targetKg: edit.target_kg, repMin: edit.target_rep_min ?? editItem.target.rep_min, repMax: edit.target_rep_max ?? editItem.target.rep_max }}
            workingTotal={editItem.target.sets}
            initialKg={edit.weight_kg}
            existing={edit}
            saveLabel="Lưu"
            onSave={async (s) => {
              await saveSet(s);
              setEdit(null);
              await invalidate(qk.session(id), qk.training);
            }}
          />
        )}
      </Sheet>
    </Page>
  );
}
