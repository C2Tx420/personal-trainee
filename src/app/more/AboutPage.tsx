import changelog from '../../../CHANGELOG.md?raw';
import { useAuth } from '@/auth/AuthGate';
import { useAppMeta } from '@/data/queries';
import { APP_VERSION, BUILD_TIME, GIT_SHA, PLAN_DOC_VERSION } from '@/lib/version';
import { Button, Card, Page, SectionTitle } from '@/ui/components';

export function AboutPage() {
  const { lock, signOut } = useAuth();
  const meta = useAppMeta();
  const built = new Date(BUILD_TIME).toLocaleDateString('vi-VN');
  return (
    <Page title="Cài đặt & giới thiệu" back="/more">
      <Card>
        <div className="mb-1 text-lg font-bold">Sức khỏe & Tập luyện</div>
        <div className="tabular text-sm" data-testid="version-line">
          Phiên bản {APP_VERSION} ({GIT_SHA}) · build {built} · Plan {PLAN_DOC_VERSION} · DB {meta.data?.schema_version ?? '…'}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={lock}>Khoá ngay</Button>
        <Button variant="danger" onClick={() => void signOut()}>Đăng xuất</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Tự khoá sau 5 phút không thao tác. Đổi PIN: chạy `supabase secrets set APP_PIN=…` trên máy tính.</p>
      <SectionTitle>Có gì mới</SectionTitle>
      <Card>
        <pre className="text-xs leading-relaxed whitespace-pre-wrap">{changelog}</pre>
      </Card>
    </Page>
  );
}
