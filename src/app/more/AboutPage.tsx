import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthGate';
import { useAppMeta } from '@/data/queries';
import { APP_VERSION, BUILD_TIME, GIT_SHA, PLAN_DOC_VERSION } from '@/lib/version';
import { Button, Card, Page } from '@/ui/components';
import { RELEASES } from '../whats-new';

export function AboutPage() {
  const nav = useNavigate();
  const { signOut } = useAuth();
  const meta = useAppMeta();
  const built = new Date(BUILD_TIME).toLocaleDateString('vi-VN');
  return (
    <Page title="Cài đặt & giới thiệu" back="/more">
      <Card>
        <div className="mb-1 text-lg font-bold">Personal Trainee</div>
        <div className="tabular text-sm" data-testid="version-line">
          Phiên bản {APP_VERSION} ({GIT_SHA}) · build {built} · Plan {PLAN_DOC_VERSION} · DB {meta.data?.schema_version ?? '…'}
        </div>
      </Card>
      <Card onClick={() => nav('/more/whats-new')}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">Có gì mới</div>
            <div className="truncate text-sm text-muted">{RELEASES[0].date} · {RELEASES[0].title}</div>
          </div>
          <span className="text-muted">›</span>
        </div>
      </Card>
      <Button variant="danger" block onClick={() => void signOut()}>
        Đăng xuất
      </Button>
    </Page>
  );
}
