import type { PlanVersion } from '@/data/api';
import { Badge } from '@/ui/components';

const STATUS_LABEL: Record<PlanVersion['status'], string> = {
  draft: 'Chờ duyệt',
  scheduled: 'Hẹn ngày',
  active: 'Đang dùng',
  archived: 'Lưu trữ',
  rejected: 'Từ chối',
};

export const CREATED_BY_LABEL: Record<PlanVersion['created_by'], string> = {
  user: 'Anh',
  claude_code: 'Claude Code',
  system: 'Tự động (cân đứng)',
};

export function StatusBadge({ status }: { status: PlanVersion['status'] }) {
  const tone = { draft: 'accent', scheduled: 'info', active: 'ok', archived: 'muted', rejected: 'bad' } as const;
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}
