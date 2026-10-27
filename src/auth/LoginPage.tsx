import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Field, Input } from '@/ui/components';

/** Sign in once per device (§3.1). Email/password are never in code or .env. */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu' : err.message);
    } else {
      // signing in again with the password → reset the wrong-PIN counter
      await supabase.rpc('reset_pin_attempts');
    }
    setBusy(false);
  }

  return (
    <div className="safe-top mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <img src="/icons/favicon.svg" alt="" className="mx-auto mb-5 size-16 rounded-[18px]" />
        <h1 className="text-[28px] font-bold tracking-tight">Sức khỏe <span className="text-accent">&</span> Tập luyện</h1>
        <p className="mt-1 text-sm text-muted">Đăng nhập một lần trên thiết bị này</p>
      </div>
      <form onSubmit={submit} className="glass rounded-card p-5">
        <Field label="Email">
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Mật khẩu">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Banner tone="bad">{error}</Banner>}
        <Button variant="primary" size="lg" block disabled={busy} type="submit">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </div>
  );
}
