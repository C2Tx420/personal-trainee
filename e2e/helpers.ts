import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, E2E_PIN } from './env';

export const SHOT_DIR = path.resolve(import.meta.dirname, 'screenshots');
export const shots: { file: string; title: string }[] = [];

/** Chụp toàn trang để review; title dùng cho trang gallery. */
export async function shot(page: Page, file: string, title: string) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(300);
  // thanh tab cố định → đưa xuống cuối trang để ảnh toàn trang không bị che
  const style = await page.addStyleTag({ content: 'nav.fixed{position:static!important}' });
  await page.screenshot({ path: path.join(SHOT_DIR, `${file}.png`), fullPage: true });
  await style.evaluate((el) => (el as Element).remove());
  shots.push({ file: `${file}.png`, title });
}

export async function enterPin(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

export async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Mật khẩu').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Nhập PIN' })).toBeVisible();
}

export async function unlock(page: Page) {
  await enterPin(page, E2E_PIN);
  await expect(page.getByRole('heading', { name: /Hôm nay/ })).toBeVisible({ timeout: 20_000 });
}

/** Bỏ qua đồng hồ nghỉ nếu đang hiện. */
export async function skipRest(page: Page) {
  const timer = page.getByRole('timer', { name: 'Đồng hồ nghỉ' });
  if (await timer.isVisible().catch(() => false)) await timer.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(timer).toBeHidden();
}

/** Bấm XONG HIỆP rồi bỏ qua nghỉ. */
export async function completeSet(page: Page) {
  await page.getByRole('button', { name: '✓ XONG HIỆP' }).click();
  await expect(page.getByRole('button', { name: 'Đang lưu…' })).toBeHidden();
  await skipRest(page);
}

/** Điều hướng phía client (không tải lại trang → không bị khoá PIN). */
export async function nav(page: Page, to: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, to);
}

/** Tải lại trang (app tự khoá) rồi mở khoá bằng PIN. */
export async function reloadAndUnlock(page: Page, to?: string) {
  if (to) await page.goto(to);
  else await page.reload();
  await expect(page.getByRole('heading', { name: 'Nhập PIN' })).toBeVisible();
  await enterPin(page, E2E_PIN);
  await expect(page.getByRole('heading', { name: 'Nhập PIN' })).toBeHidden({ timeout: 20_000 });
}
