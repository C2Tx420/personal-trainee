import { useEffect } from 'react';
import changelog from '../../../CHANGELOG.md?raw';
import { APP_VERSION } from '@/lib/version';
import { Card, Page } from '@/ui/components';
import { ReleaseHeader, ReleaseItems } from '../WhatsNew';
import { markWhatsNewSeen, RELEASES } from '../whats-new';

/** All releases in plain Vietnamese; the technical CHANGELOG.md stays one tap away. */
export function WhatsNewPage() {
  useEffect(markWhatsNewSeen, []);
  return (
    <Page title="Có gì mới" back="/more">
      {RELEASES.map((r) => (
        <Card key={r.id}>
          <ReleaseHeader release={r} />
          <ReleaseItems release={r} />
        </Card>
      ))}
      <details className="glass rounded-card mt-3 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Nhật ký kỹ thuật (CHANGELOG · phiên bản {APP_VERSION})</summary>
        <pre className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-muted">{changelog}</pre>
      </details>
    </Page>
  );
}
