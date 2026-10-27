import changelog from '../../../CHANGELOG.md?raw';
import { useAuth } from '@/auth/AuthGate';
import { useAppMeta } from '@/data/queries';
import { APP_VERSION, BUILD_TIME, GIT_SHA, PLAN_DOC_VERSION } from '@/lib/version';
import { Button, Card, Page, SectionTitle } from '@/ui/components';

export function AboutPage() {
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
      <Button variant="danger" block onClick={() => void signOut()}>
        Đăng xuất
      </Button>
      <SectionTitle>Có gì mới</SectionTitle>
      <Card>
        <pre className="text-xs leading-relaxed whitespace-pre-wrap">{changelog}</pre>
      </Card>
    </Page>
  );
}
