import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { API_URL, E2E_PIN, psql, supabaseEnv } from './env';
import { completeSet, enterPin, login, nav, reloadAndUnlock, SHOT_DIR, shot, shots, skipRest, unlock } from './helpers';

/**
 * Full-flow E2E on an iPhone viewport, run serially on a single page.
 * Each step saves a screenshot to e2e/screenshots/ + an index.html page for review.
 */
test.describe.configure({ mode: 'serial' });

let page: Page;
const errors: string[] = [];
const ROOT = path.resolve(import.meta.dirname, '..');
const COACH_ENV = { ...process.env, COACH_DATABASE_URL: 'postgresql://coach_readonly:coach-local-only@127.0.0.1:54322/postgres' };

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|getUserMedia/.test(m.text())) errors.push(m.text());
  });
});

test.afterAll(async () => {
  const cards = shots
    .map((s) => `<figure><a href="${s.file}"><img src="${s.file}" loading="lazy"></a><figcaption>${s.file.replace('.png', '')} — ${s.title}</figcaption></figure>`)
    .join('\n');
  fs.writeFileSync(
    path.join(SHOT_DIR, 'index.html'),
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>E2E screenshots</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f5f7}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;align-items:start}
figure{margin:0;background:#fff;border-radius:12px;padding:8px}img{width:100%;border-radius:8px;border:1px solid #e1e5ea}figcaption{margin-top:6px;font-weight:600}</style>
<h1>Personal Trainee — E2E (${new Date().toLocaleString('vi-VN')})</h1><main>${cards}</main>\n`,
  );
  await page.close();
});

test('01 đăng nhập + PIN', async () => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  await shot(page, '01-login', 'Đăng nhập (1 lần mỗi thiết bị)');
  await login(page);
  await shot(page, '02-pin', 'Khoá PIN 4 số');
  await enterPin(page, '0000');
  await expect(page.getByText('Sai PIN — còn 4 lần thử')).toBeVisible();
  await shot(page, '03-pin-wrong', 'PIN sai — đếm ở server, còn 4 lần');
  await unlock(page);
});

test('02 Hôm nay (luôn giao diện tối, kể cả khi máy để chế độ sáng)', async () => {
  await expect(page.getByText('Kéo xô cáp').first()).toBeVisible();
  await expect(page.getByText(/Noel · 25\/12/)).toBeVisible();
  await expect(page.getByText(/Còn 59 ngày/)).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(20, 18, 17)');
  await shot(page, '04-today', 'Hôm nay — buổi Pull, khởi động, đếm ngược mốc Noel (theme kiểu Crouton)');

  // skip the day with a reason, then undo
  await page.getByRole('button', { name: 'Nghỉ buổi này' }).click();
  await page.getByRole('button', { name: 'Bận việc' }).click();
  await shot(page, '04b-skip-day', 'Nghỉ buổi này: chọn lý do / ghi chú cho coach');
  await page.getByRole('button', { name: /Lưu — nghỉ buổi này/ }).click();
  await expect(page.getByText('Đã nghỉ')).toBeVisible();
  expect(psql("select status || ':' || note from workout_sessions where kind = 'pull' and status = 'skipped'")).toBe('skipped:Bận việc');
  await page.getByRole('button', { name: 'Huỷ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu buổi tập' })).toBeVisible();
});

test('03 thư viện bài tập + lịch sử', async () => {
  await page.getByRole('link', { name: 'Bài tập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bài tập' })).toBeVisible();
  await shot(page, '06-exercises', 'Thư viện bài tập (đang dùng) — hình SVG');
  await page.getByRole('button', { name: /Máy đẩy ngực/ }).first().click();
  await expect(page.getByText('Lịch sử tạ')).toBeVisible();
  await expect(page.getByText('27×12').first()).toBeVisible();
  await shot(page, '07-exercise-detail', 'Chi tiết bài: hình, kỹ thuật, lịch sử buổi 26/10 (2 làm nóng 20kg + 3×27kg)');
});

test('04 luồng tập Pull: khởi động → làm nóng → đổi kg → tiếp tục sau khi tải lại', async () => {
  await page.getByRole('link', { name: 'Hôm nay', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu buổi tập' }).click();
  await expect(page.getByRole('heading', { name: 'Khởi động', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu đếm giờ' }).click();
  await page.getByRole('checkbox').check();
  await shot(page, '08-warmup', 'Bước khởi động: đồng hồ đi bộ 10′ + khớp');
  await page.getByRole('button', { name: 'Tiếp →' }).click();

  await expect(page.getByRole('heading', { name: 'Kéo xô cáp' })).toBeVisible();
  await shot(page, '09-intro', 'Màn giới thiệu bài 1/5 — hình, mục tiêu, coach note');
  await page.getByRole('button', { name: 'Bắt đầu bài' }).click();
  await expect(page.getByText('Làm nóng 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'kg', exact: true })).toHaveValue('25');
  await shot(page, '10-set-warmup', 'Hiệp làm nóng 1 — 25kg × 10 (nút −/+ to)');
  await page.getByRole('button', { name: 'Xong hiệp' }).click();
  await expect(page.getByRole('timer', { name: 'Đồng hồ nghỉ' })).toBeVisible();
  await shot(page, '11-rest', 'Đồng hồ nghỉ toàn màn + xem trước hiệp tiếp');
  await skipRest(page);
  await completeSet(page); // warm-up 2

  // Reload mid-session → PIN lock → resumes at working set 1
  await page.reload();
  await enterPin(page, E2E_PIN);
  await expect(page.getByText('Hiệp chính 1/3', { exact: true })).toBeVisible({ timeout: 20_000 });
  await skipRest(page);

  await expect(page.getByRole('textbox', { name: 'kg', exact: true })).toHaveValue('35');
  await page.getByRole('button', { name: 'Giảm kg' }).click();
  await expect(page.getByTestId('kg-change')).toBeVisible();
  await page.getByRole('button', { name: 'Nặng quá' }).click();
  await page.getByRole('button', { name: 'Nặng', exact: true }).click();
  await shot(page, '12-kg-change', 'Không tập được 35kg → ghi 30kg + lý do "Nặng quá"');
  await completeSet(page);
  await expect(page.getByText('Hiệp chính 2/3', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'kg', exact: true })).toHaveValue('30');
  await completeSet(page);
  await completeSet(page);
});

test('05 đổi bài (gõ máy thay thế) · để sau · bỏ bài · danh sách', async () => {
  await expect(page.getByRole('heading', { name: 'Máy chèo tựa ngực' })).toBeVisible();
  await page.getByRole('button', { name: 'Đổi bài', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Bài thay thế').fill('may cheo tua nguc');
  await expect(dlg.getByText(/chính là bài đang đổi/)).toBeVisible();
  await expect(dlg.getByText(/Dùng tên mới/)).toHaveCount(0);
  await dlg.getByLabel('Bài thay thế').fill('Máy chèo ngồi Impulse');
  await dlg.getByPlaceholder('vd. máy hỏng, đổi sang tạ đơn').fill('phòng không có máy tựa ngực');
  await shot(page, '13-substitute', 'Đổi bài: chọn lý do + gõ tên máy thay thế (chưa có → bài tạm)');
  await dlg.getByRole('button', { name: 'Đổi & tập' }).click();
  await expect(page.getByRole('heading', { name: 'Máy chèo ngồi Impulse' })).toBeVisible();
  await expect(page.getByText(/Thay cho Máy chèo tựa ngực/)).toBeVisible();
  await shot(page, '14-provisional', 'Bài tạm đã thay — giữ số hiệp, kg từ mục tiêu');
  await page.getByRole('button', { name: 'Để sau', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Kéo cáp ngồi' })).toBeVisible();
  await page.getByRole('button', { name: 'Danh sách bài' }).click();
  await shot(page, '15-overview', 'Danh sách bài: xong / đang / để sau / đã đổi');
  await page.getByRole('button', { name: 'Đóng' }).click();

  await page.getByRole('button', { name: 'Bỏ bài', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Máy bận lâu' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bỏ bài', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Face pull (cáp)' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu bài' }).click();
  await page.getByRole('button', { name: 'Vừa', exact: true }).click();
  await page.getByRole('button', { name: 'Ghi chú hiệp' }).click();
  await page.getByPlaceholder('Ghi chú hiệp (vd. đau vai trái)').fill('hơi mỏi vai sau');
  await completeSet(page);
  await completeSet(page);
  await completeSet(page);

  await expect(page.getByRole('heading', { name: 'Máy cuốn tay trước' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu bài' }).click();
  for (let i = 0; i < 3; i++) await completeSet(page);

  // the deferred exercise comes back at the end of the session
  await expect(page.getByRole('heading', { name: 'Máy chèo ngồi Impulse' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu bài' }).click();
  for (let i = 0; i < 5; i++) await completeSet(page);
});

test('06 tổng kết + chi tiết buổi', async () => {
  await expect(page.getByRole('heading', { name: 'Tổng kết buổi' })).toBeVisible();
  await expect(page.getByText(/Máy chèo tựa ngực → /)).toBeVisible();
  await expect(page.getByText(/kế hoạch 35kg → thực tế/)).toHaveCount(3);
  await shot(page, '16-summary', 'Tổng kết: bài đổi, kg khác kế hoạch, khối lượng');
  await page.getByRole('button', { name: 'Lưu & kết thúc' }).click();
  await expect(page.getByRole('heading', { name: /Pull · 27\/10/ })).toBeVisible();
  await shot(page, '17-session-detail', 'Chi tiết buổi đã lưu — sửa từng hiệp, xoá buổi');

  const n = psql("select count(*) from workout_sets s join workout_sessions w on w.id = s.session_id where w.session_date = '2026-10-27' and s.completed");
  expect(Number(n)).toBe(16); // lat pulldown 5 + face pull 3 + curl 3 + Impulse row 5
  expect(psql("select count(*) from workout_sets where kg_change_reason = 'too_heavy'")).toBe('3');
  expect(psql("select substitution_reason || '|' || substitution_note from workout_session_items where substitution_reason is not null")).toBe(
    'unavailable|phòng không có máy tựa ngực',
  );
  expect(psql("select available_at_gym from exercises where slug = 'chest_supported_machine_row'")).toBe('f');
});

test('07 tab Tập: tuần, biểu đồ, ghi nhanh bằng chữ, ghi bù, cầu lông', async () => {
  await page.getByRole('link', { name: 'Tập', exact: true }).click();
  await expect(page.getByText(/2\/4 buổi/)).toBeVisible();
  await page.getByLabel('Chọn bài').selectOption({ label: 'Kéo xô cáp' });
  await shot(page, '18-training', 'Tập: tổng kết tuần, khối lượng theo bài, tạ vs mục tiêu, lịch sử');

  await page.getByRole('button', { name: 'Ghi nhanh', exact: true }).click();
  await page.getByLabel('Ghi chú buổi tập').fill(
    '24/10 legs\nwarm up 10p đi bộ 3.5-5\nđạp đùi\n2 set x 12 30kg\n3 set x 12 40kg\nmáy cuốn đùi\n3x12x20\nnhón gót máy cũ\n3 set x 15 40kg',
  );
  await shot(page, '19-quicklog-text', 'Ghi nhanh: dán ghi chú như tin nhắn');
  await page.getByRole('button', { name: 'Tách thành bài + hiệp →' }).click();
  await expect(page.getByText(/là làm nóng/)).toBeVisible();
  // unknown name "nhón gót máy cũ" has no match → pick an exercise
  await page.getByLabel('Chọn bài').fill('nhón');
  await page.getByRole('button', { name: /Máy nhón bắp chân/ }).click();
  await shot(page, '20-quicklog-preview', 'Ghi nhanh: xem trước — tự đánh dấu làm nóng, chọn bài cho tên lạ');
  await page.getByRole('button', { name: 'Lưu buổi tập' }).click();
  await expect(page.getByRole('heading', { name: /Legs · 24\/10/ })).toBeVisible();
  expect(psql("select 'nhón gót máy cũ' = any(aliases) from exercises where slug = 'calf_raise'")).toBe('t');

  await nav(page, '/training/backfill');
  await page.getByRole('button', { name: /Điền theo lộ trình/ }).click();
  await shot(page, '21-backfill', 'Ghi bù: điền theo lộ trình rồi sửa số');

  await nav(page, '/training/simple/badminton');
  await expect(page.getByText(/≈ 463 kcal/)).toBeVisible();
  await shot(page, '22-badminton', 'Ghi cầu lông: 75′ nhẹ ≈ 463 kcal (tham khảo, không ăn bù)');
});

test('08 cơ thể: cân + số đo, InBody', async () => {
  await page.getByRole('link', { name: 'Cơ thể', exact: true }).click();
  await page.getByLabel('Cân nặng (kg)').fill('81,2');
  await page.getByRole('button', { name: /Số đo chính/ }).click();
  await page.getByLabel('Vòng eo (ngang rốn)').fill('96');
  await page.getByLabel('Vòng hông').fill('102');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã lưu')).toBeVisible();
  await shot(page, '23-body', 'Cân tuần + biểu đồ có đường mục tiêu');
  await page.getByRole('tab', { name: 'Số đo' }).click();
  await page.getByLabel('Chọn số đo').selectOption({ label: 'Vòng eo (ngang rốn)' });
  await expect(page.getByText('WHR (eo/hông) gần nhất')).toBeVisible();
  await shot(page, '24-measurements', 'Số đo + WHR');
  await page.getByRole('button', { name: 'InBody' }).click();
  await expect(page.getByText(/Ước tính % mỡ tại các mốc/)).toBeVisible();
  await shot(page, '25-inbody', 'InBody: lần 26/10, ước tính mỡ tại từng mốc');
});

test('09 ảnh tiến độ: camera, xoá EXIF, nén 1080px, so sánh', async () => {
  // 2000×1500 JPEG with an APP1/Exif segment to test the metadata-stripping pipeline
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 2000;
    c.height = 1500;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 2000, 1500);
    grd.addColorStop(0, '#f4a261');
    grd.addColorStop(1, '#264653');
    g.fillStyle = grd;
    g.fillRect(0, 0, 2000, 1500);
    g.fillStyle = '#fff';
    g.font = 'bold 160px sans-serif';
    g.fillText('ẢNH THỬ', 600, 800);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  });
  const raw = Buffer.from(b64, 'base64');
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0, 0, 0, 0]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
  const withExif = Buffer.concat([raw.subarray(0, 2), app1, raw.subarray(2)]);
  expect(withExif.includes(Buffer.from('Exif'))).toBe(true);
  const fixture = path.join(ROOT, 'test-results', 'photo-with-exif.jpg');
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  fs.writeFileSync(fixture, withExif);

  await page.getByRole('link', { name: 'Cơ thể', exact: true }).click();
  await page.getByRole('button', { name: 'Ảnh tiến độ' }).click();
  await page.getByRole('button', { name: 'Chụp bộ mới' }).click();
  await expect(page.locator('video')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await shot(page, '26-photo-capture', 'Chụp ảnh: camera + khung người hướng dẫn (camera giả lập)');
  for (const label of ['Nghiêng', 'Lưng', null]) {
    await page.getByTestId('photo-file').setInputFiles(fixture);
    if (label) await expect(page.getByRole('heading', { name: new RegExp(label) })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Ảnh tiến độ' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Ảnh back/ })).toBeVisible();
  await shot(page, '27-photos', 'Ảnh tiến độ: 3 góc, chỉ xem qua signed URL');

  // Check the real file in Storage: no EXIF left, long edge ≤ 1080
  const { SERVICE_ROLE_KEY } = supabaseEnv();
  const pathInBucket = psql("select storage_path from progress_photos where angle = 'front'");
  const res = await fetch(`${API_URL}/storage/v1/object/progress-photos/${pathInBucket}`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY },
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
  expect(bytes.includes(Buffer.from('Exif'))).toBe(false);
  let w = 0;
  let h = 0;
  for (let i = 2; i < bytes.length; ) {
    const marker = bytes[i + 1];
    const len = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      h = bytes.readUInt16BE(i + 5);
      w = bytes.readUInt16BE(i + 7);
      break;
    }
    i += 2 + len;
  }
  expect(Math.max(w, h)).toBe(1080);
  expect(psql("select public from storage.buckets where id = 'progress-photos'")).toBe('f');

  await page.getByRole('button', { name: 'So sánh' }).click();
  await shot(page, '28-photo-compare', 'So sánh ảnh — cạnh nhau');
  await page.getByRole('tab', { name: 'Trượt' }).click();
  await shot(page, '29-photo-slider', 'So sánh ảnh — thanh trượt chồng ảnh');
});

test('10 Claude Code: báo cáo tuần → draft + nhận xét → duyệt trong app', async () => {
  const report = JSON.parse(execSync('pnpm exec tsx scripts/weekly-report.ts --week 2026-10-26', { cwd: path.join(ROOT, 'coach'), env: COACH_ENV, encoding: 'utf8' }));
  expect(report.schema).toBe('coach-weekly/1');
  expect(report.training.done_sessions).toBeGreaterThanOrEqual(2);
  expect(report.training.kg_changes.filter((k: { reason: string }) => k.reason === 'too_heavy')).toHaveLength(3);
  expect(report.training.substitutions[0]).toMatchObject({ planned: 'chest_supported_machine_row', reason: 'unavailable' });
  expect(report.provisional_exercises).toHaveLength(1);
  expect(JSON.stringify(report)).not.toContain('storage_path');
  fs.mkdirSync(path.join(ROOT, 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'test-results', 'coach-report.json'), JSON.stringify(report, null, 2));

  // Claude's changes: lat pulldown 35→32.5kg; add cable chest press; complete the provisional exercise; calories 1,900→1,850
  const content = report.active_plan.content;
  const pull = content.templates.find((t: { key: string }) => t.key === 'pull');
  pull.items[0].target_kg = 32.5;
  pull.items[0].coach_note = '3/3 hiệp "nặng quá" ở 35kg → 32,5kg; đủ 3×10 thì lên lại 35kg';
  pull.items[1].exercise = report.provisional_exercises[0].slug;
  pull.items[1].alternatives = ['one_arm_db_row', 'seated_cable_row'];
  const push = content.templates.find((t: { key: string }) => t.key === 'push');
  push.items[2] = { ...push.items[2], exercise: 'cable_fly', alternatives: ['pec_deck_fly'] };
  content.nutrition.calories_kcal = 1850;
  const svg = (slug: string, name: string) => fs.readFileSync(path.join(ROOT, 'supabase/seed/exercises', `${slug}.svg`), 'utf8').trim().replace(/aria-label="[^"]*"/, `aria-label="${name}"`);
  content.exercise_upserts = [
    {
      slug: 'cable_fly', name_vi: 'Ép ngực cáp', aliases: ['cable fly', 'ép ngực cáp'], primary_muscle: 'chest', secondary_muscles: ['front_delt'],
      movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5, is_time_based: false,
      cues: ['Khuỷu hơi cong cố định', 'Ép tay về giữa ngực, siết 1 giây'], common_mistakes: ['Biến thành động tác đẩy'], illustration_svg: svg('pec_deck_fly', 'Ép ngực cáp'),
    },
    {
      slug: report.provisional_exercises[0].slug, name_vi: 'Máy chèo ngồi Impulse', aliases: ['Máy chèo ngồi Impulse', 'chèo impulse'], primary_muscle: 'upper_back',
      secondary_muscles: ['lats', 'biceps'], movement_pattern: 'horizontal_pull', kind: 'compound', equipment: 'machine', load_step_kg: 5, is_time_based: false,
      cues: ['Ngực sát đệm', 'Kéo khuỷu ra sau, siết bả vai'], common_mistakes: ['Giật người'], illustration_svg: svg('chest_supported_machine_row', 'Máy chèo ngồi Impulse'),
    },
  ];
  const draftFile = path.join(ROOT, 'test-results', 'coach-draft.json');
  fs.writeFileSync(draftFile, JSON.stringify(content));
  const out = JSON.parse(
    execSync(`pnpm exec tsx scripts/submit-draft.ts --file "${draftFile}" --note "Kéo xô 35→32,5kg (3 hiệp nặng quá); hoàn thiện bài tạm máy chèo Impulse; ép ngực cáp thay pec deck; calo tham khảo 1.900→1.850"`, {
      cwd: path.join(ROOT, 'coach'), env: COACH_ENV, encoding: 'utf8',
    }),
  );
  const noteFile = path.join(ROOT, 'test-results', 'coach-note.md');
  fs.writeFileSync(
    noteFile,
    '**Tiến độ cân**: 81,2 kg (−0,5 so với 26/10) · Noel còn 8,3 tuần, cần −0,51 kg/tuần → đúng hướng.\n**Tập luyện**: 2/4 buổi tới T3, khởi động đủ. Kéo xô hụt ở 35kg (3 hiệp "nặng quá").\n**Đề xuất**: draft — kéo xô 32,5kg, ép ngực cáp thay pec deck, hoàn thiện bài máy chèo Impulse.',
  );
  execSync(`pnpm exec tsx scripts/add-review-note.ts --week 2026-10-26 --file "${noteFile}" --plan ${out.draft_id}`, { cwd: path.join(ROOT, 'coach'), env: COACH_ENV });

  // The coach role cannot activate a plan
  expect(() => execSync(`psql "postgresql://coach_readonly:coach-local-only@127.0.0.1:54322/postgres" -c "update plan_versions set status='active'"`, { stdio: 'pipe' })).toThrow();

  await reloadAndUnlock(page, '/');
  await expect(page.getByText('Có 1 lộ trình mới chờ duyệt')).toBeVisible();
  await expect(page.getByText('Nhận xét tuần mới từ coach')).toBeVisible();
  await shot(page, '30-today-draft', 'Hôm nay: banner lộ trình chờ duyệt + nhận xét coach');
  await page.getByText('Có 1 lộ trình mới chờ duyệt').click();
  await expect(page.getByText(/32,5 kg/)).toBeVisible();
  await shot(page, '31-plan-diff', 'Diff draft của Claude: đổi tạ, bài mới (kèm hình), sửa bài tạm, calo');
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await shot(page, '32-approve', 'Duyệt: áp dụng hôm nay hoặc chọn ngày');
  await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(page.getByText('Đã duyệt — áp dụng từ hôm nay')).toBeVisible();
  await shot(page, '33-approved', 'Đã duyệt → v2 active, v1 lưu trữ');
  expect(psql("select version_no || ':' || status from plan_versions order by version_no")).toBe('1:archived\n2:active');
  expect(psql("select is_provisional::text || ':' || name_vi from exercises where slug like 'user_%'")).toBe('false:Máy chèo ngồi Impulse');
});

test('11 Thêm: lộ trình, nhận xét, nhắc nhở, sao lưu, giới thiệu', async () => {
  await page.getByRole('link', { name: 'Thêm', exact: true }).click();
  await shot(page, '34-more', 'Tab Thêm');
  await page.getByText('Lộ trình', { exact: true }).click();
  await expect(page.getByText('v2', { exact: true })).toBeVisible();
  await shot(page, '35-plans', 'Lịch sử phiên bản lộ trình');
  await nav(page, '/more/reviews');
  await expect(page.getByText(/Kéo xô hụt ở 35kg/)).toBeVisible();
  await shot(page, '36-reviews', 'Nhận xét coach');
  await nav(page, '/more/reminders');
  await expect(page.getByText('Review tuần với Claude Code')).toBeVisible();
  await shot(page, '37-reminders', 'Nhắc nhở: cân T2 06:30, review 10:00…');
  await nav(page, '/more/backup');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải file sao lưu' }).click()]);
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(backup.schema).toBe('pt-backup/1');
  expect(backup.tables.workout_sets.length).toBeGreaterThan(20);
  expect(backup.tables).not.toHaveProperty('app_lock');
  expect(backup).not.toHaveProperty('photos');
  await shot(page, '38-backup', 'Sao lưu JSON (không kèm ảnh mặc định)');
  await nav(page, '/more/about');
  await expect(page.getByTestId('version-line')).toContainText('Plan v2.5');
  await expect(page.getByTestId('version-line')).toContainText('DB 20261027000900');
  await shot(page, '39-about', 'Giới thiệu: phiên bản app, plan, DB, changelog');
  await nav(page, '/exercises');
  await page.getByRole('button', { name: 'Không có máy', exact: true }).click();
  await expect(page.getByText('Máy chèo tựa ngực', { exact: true })).toBeVisible();
  await shot(page, '40-unavailable', 'Bài đánh dấu "không có máy" — Claude không chọn lại');
});

test('12 mất mạng + khoá sau 5 lần sai PIN', async () => {
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cần kết nối mạng' })).toBeVisible();
  await shot(page, '41-offline', 'Mất mạng: màn "Cần kết nối mạng" (online-only)');
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nhập PIN' })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await enterPin(page, '9999');
    await expect(page.getByText(`Sai PIN — còn ${4 - i} lần thử`)).toBeVisible();
  }
  await enterPin(page, '9999');
  await expect(page.getByText(/Sai 5 lần/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible({ timeout: 10_000 });
  await shot(page, '42-locked-out', 'Sai PIN 5 lần → thu hồi phiên, phải đăng nhập lại');
  await login(page);
  await unlock(page);
  expect(errors).toEqual([]);
});
