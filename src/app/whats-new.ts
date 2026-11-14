import { useSyncExternalStore } from 'react';
import { formatVN } from '@/engine/dates';
import { t } from '@/i18n';

/**
 * "Có gì mới" — user-facing release notes in Vietnamese, newest first.
 * CHANGELOG.md stays the technical log; add an entry here for every change he can see or use.
 * A new `id` at the top shows the sheet once after the update.
 */
export type WhatsNewItem = { icon: string; title: string; body: string; to?: string };
export type WhatsNewRelease = { id: string; date: string; title: string; plan: string; items: WhatsNewItem[] };

export const RELEASES: WhatsNewRelease[] = [
  {
    id: '2026-11-14',
    date: '14/11/2026',
    title: t('Giao diện tiếng Anh'),
    plan: 'v2.8',
    items: [
      { icon: '🌐', title: t('Chọn ngôn ngữ'), body: t('Thêm → "Ngôn ngữ / Language": Tiếng Việt (mặc định) hoặc English. Chỉ đổi trên máy này; ngày và số hiển thị theo ngôn ngữ.'), to: '/more' },
      { icon: '📝', title: t('Nội dung giữ nguyên'), body: t('Ghi chú, cảm nhận, nhận xét coach, kỹ thuật bài tập và thông báo đẩy vẫn bằng tiếng Việt. Ghi nhanh vẫn gõ tiếng Việt như cũ.') },
    ],
  },
  {
    id: '2026-11-13',
    date: '13/11/2026',
    title: t('Đổi buổi tập linh hoạt'),
    plan: 'v2.8',
    items: [
      { icon: '🔀', title: t('Đổi buổi tập bất kỳ ngày nào'), body: t('Ngày tạ: bấm "Đổi sang buổi khác" để tập Push / Pull / Thân trên / Legs / bản nhẹ thay buổi theo lịch. Ngày cầu lông: thay bằng cardio nhẹ hoặc một buổi tạ. Ngày nghỉ, Chủ nhật: "Vẫn muốn tập tạ". Buổi theo lịch được ghi là nghỉ kèm lý do "Đổi sang …" để coach biết. Legs chỉ bị ẩn khi sát ngày cầu lông hoặc Chủ nhật.'), to: '/' },
      { icon: '🗓️', title: t('Ghi bù cũng đổi được'), body: t('Vào "+ Ghi bù", chọn ngày còn trống buổi theo lịch rồi chọn loại buổi khác: tick "buổi này thay …" để buổi theo lịch được ghi là nghỉ. Ngày cầu lông còn có nút Cardio zone 2 / Đi bộ.'), to: '/training/backfill' },
      { icon: '📏', title: t('Sửa ô nhập bị đè'), body: t('Ô Ngày không còn tràn đè lên ô Cân nặng (và các form 2 cột khác) trên iPhone.'), to: '/body' },
    ],
  },
  {
    id: '2026-11-08',
    date: '08/11/2026',
    title: t('4 buổi gym: thêm buổi Thân trên T6'),
    plan: 'v2.8',
    items: [
      { icon: '🗓️', title: t('Buổi Thân trên thứ Sáu'), body: t('Lịch mới: T2 Push · T3 Pull · T6 Thân trên · T7 Legs. Buổi Thân trên tập xô, vai sau, vai ngang và ngực lần 2 — chủ yếu máy, nặng vừa để T7 còn sức tập chân. Bài và mức tạ do coach đặt ở lộ trình tuần, duyệt rồi mới áp dụng.') },
      { icon: '🏸', title: t('Cầu lông là ngày nghỉ nhẹ'), body: t('Cầu lông T5 không còn tính là buổi chính: tiến độ tuần đếm 4 buổi gym, cầu lông vẫn ghi và đếm riêng như vận động nhẹ.'), to: '/training' },
    ],
  },
  {
    id: '2026-11-06',
    date: '06/11/2026',
    title: t('Tên tiếng Anh, máy trợ lực, so với lần trước'),
    plan: 'v2.7',
    items: [
      { icon: '🔤', title: t('Tên bài tiếng Anh'), body: t('Tất cả bài tập đổi sang tên tiếng Anh như ở phòng tập (vd. Machine Chest Press, Cable Lat Pulldown). Tên tiếng Việt cũ vẫn nằm trong "Tên gọi khác" — gõ tiếng Việt khi tìm, đổi bài hay ghi nhanh vẫn ra đúng bài. Hướng dẫn kỹ thuật giữ tiếng Việt.'), to: '/exercises' },
      { icon: '🪢', title: t('Máy trợ lực tính đúng chiều'), body: t('Kéo xà / dip trợ lực: kg là trợ lực nên kg thấp hơn mới là khoẻ hơn. Kỷ lục 🏆, "↑ hơn lần trước", gợi ý tạ và thẻ Tiến độ giờ tính đúng chiều; không còn làm nóng theo %. Bài khác cũng là máy trợ lực thì bật "Máy trợ lực" ở trang bài.'), to: '/exercises/assisted_pull_up' },
      { icon: '↕️', title: t('So với lần trước'), body: t('Tổng kết buổi và chi tiết buổi có thẻ ↑ = ↓ cho từng hiệp chính so với đúng hiệp đó buổi trước — thấy ngay hiệp nào bị tụt (thường là hiệp cuối).'), to: '/training' },
      { icon: '🧐', title: t('Hỏi lại khi gõ số lạ'), body: t('Gõ 300 thay vì 30, 120 lần, hay 25 kg trên máy nấc lb → app hỏi lại một lần ("Đúng rồi — lưu" hoặc Sửa) khi bấm Xong hiệp; ghi nhanh / ghi bù hiện cảnh báo vàng ngay dưới hiệp. Không chặn — số đúng thì cứ lưu.') },
      { icon: '💪', title: t('Hiệp theo nhóm cơ'), body: t('Tab Tập có thẻ mới: tuần này mỗi nhóm cơ được bao nhiêu hiệp (nhóm chính 1, nhóm phụ 0,5), vùng xanh 10–20 hiệp là tham khảo, kèm TB 4 tuần trước. Thấy ngay nhóm nào đang thiếu, ví dụ xô hay vai sau.'), to: '/training' },
      { icon: '📈', title: t('Biểu đồ e1RM'), body: t('Tab Tập → Biểu đồ theo bài có thêm nút e1RM: sức mạnh ước tính từ kg × lần, so được cả khi anh đổi tạ hay đổi số lần. Chỉ để xem xu hướng, không phải mức tạ 1 lần thật.'), to: '/training' },
      { icon: '🔥', title: t('Làm nóng nhẹ hơn'), body: t('Bài đa khớp làm nóng 2 hiệp ít lần dần: 50% × 8 rồi 75% × 4 (vd. máy đẩy ngực 27 kg → 14 × 8, 18 × 4) thay cho 2 hiệp gần bằng hiệp chính. Coach đổi lộ trình sang kiểu này ở lần review tới. Kg làm nóng luôn nhẹ hơn hiệp chính ít nhất 1 nấc.') },
      { icon: '⏰', title: t('Nhắc khi chưa ghi buổi'), body: t('21:00 ngày có buổi tạ mà chưa ghi gì → nhắc: tập rồi thì ghi bù, nghỉ thì bấm "Nghỉ buổi này" để coach biết. Không nhắc sau 22:30, bỏ 3 buổi liền thì thôi nhắc. Đổi giờ hoặc tắt ở Thêm → Nhắc nhở.'), to: '/more/reminders' },
      { icon: '🗂️', title: t('Cảnh báo bản nháp cũ'), body: t('Duyệt lộ trình: nếu bản nháp soạn trên lộ trình cũ, hoặc đang có 2 bản nháp chờ, app báo ngay và có nút "Từ chối bản cũ" — không còn duyệt nhầm bản cũ như hôm 01/11.'), to: '/more/plans' },
    ],
  },
  {
    id: '2026-11-02.3',
    date: '02/11/2026',
    title: t('Cảm nhận sau buổi tập'),
    plan: 'v2.6',
    items: [
      { icon: '📝', title: t('Cảm nhận sau buổi'), body: t('Tổng kết buổi có ô ghi cảm nhận (khoẻ / mệt, ngủ, chỗ nào đau…). Quên ghi thì vào chi tiết buổi ghi bù; Lịch sử đánh dấu "Chưa ghi cảm nhận". Coach đọc khi review tuần — tuần đã review thì không sửa được nữa.'), to: '/training' },
    ],
  },
  {
    id: '2026-11-02.2',
    date: '02/11/2026',
    title: t('Buổi nhẹ ngày nghỉ, cập nhật bắt buộc'),
    plan: 'v2.6',
    items: [
      { icon: '🚶', title: t('Buổi nhẹ ngày nghỉ'), body: t('Ngày nghỉ có sẵn đi bộ / zone 2 / core nếu anh muốn vận động. Hôm trước Legs chỉ gợi ý đi bộ hoặc core để giữ chân khoẻ.'), to: '/' },
      { icon: '🏸', title: t('Không đánh cầu lông?'), body: t('Thẻ cầu lông có "Thay bằng Zone 2 / Đi bộ": tự ghi nghỉ cầu lông kèm lý do và mở màn ghi buổi thay thế (45–50 phút).'), to: '/' },
      { icon: '🔒', title: t('Cập nhật bắt buộc'), body: t('Mở app hoặc quay lại app mà có bản mới → khoá màn hình và cập nhật ngay, không cần nhập lại PIN nếu anh đang dùng dở. Đang tập thì chờ xong buổi.') },
    ],
  },
  {
    id: '2026-11-02',
    date: '02/11/2026',
    title: t('Lộ trình theo tuần, review gọn hơn'),
    plan: 'v2.6',
    items: [
      { icon: '🗓️', title: t('Lộ trình đặt tên theo tuần'), body: t('Không còn v1, v2: mỗi lộ trình là "Tuần 2 · Noel". Mỗi mục tiêu (Noel, Tết, Hè) là một giai đoạn, tuần đếm lại từ 1.'), to: '/more/plans' },
      { icon: '🔍', title: t('Duyệt lộ trình dễ xem'), body: t('Thay đổi gom theo từng buổi: bài mới / bài thay, ↑ tăng tạ / ↓ giảm tạ, lời coach ngay dưới bài; bài không đổi làm mờ; thư viện bài tập thu gọn.') },
      { icon: '💬', title: t('Nhận xét coach dạng thẻ'), body: t('Câu tóm tắt ở đầu, từng mục cân / số đo / tập luyện / đề xuất có biểu tượng, ✓ điểm tốt – ⚠ cần chú ý, câu hỏi cho anh nằm trong khung riêng. Bản cũ thu gọn.'), to: '/more/reviews' },
      { icon: '🔄', title: t('Tự cập nhật, không còn thanh nhắc'), body: t('Có bản mới thì app tự cài lúc mở app hoặc khi anh chuyển sang màn khác (không mất chữ đang gõ), không cài giữa buổi tập. Bỏ thanh "Có phiên bản mới".') },
      { icon: '🏋️', title: t('Máy là chính'), body: t('Coach giữ bài chính trên máy, mỗi buổi thêm đúng 1 bài tạ tự do. Có máy hack squat ở phòng tập.') },
    ],
  },
  {
    id: '2026-10-28',
    date: '28/10/2026',
    title: t('Máy Matrix, kỷ lục và tiến độ'),
    plan: 'v2.6',
    items: [
      {
        icon: '🎚️',
        title: t('Máy chia nấc lb'),
        body: t('Máy Matrix ghi cục tạ bằng lb: bấm nấc 40 / 50 / 60 lb, app ghi 18 / 23 / 27 kg. Nút −/+ nhảy đúng từng nấc. Bật cho máy nào ở trang chi tiết bài → "Máy chia nấc lb".'),
        to: '/exercises',
      },
      {
        icon: '🏆',
        title: t('Kỷ lục mới'),
        body: t('Tạ nặng nhất từ trước tới giờ, hoặc nhiều lần hơn ở mức tạ đã từng tập — có 🏆 trên hiệp, trong tổng kết buổi và chi tiết buổi.'),
        to: '/training',
      },
      {
        icon: '📈',
        title: t('Tiến độ từ 26/10'),
        body: t('Thẻ mới ở Hôm nay: cân trung bình tuần, vòng eo, và tạ nặng nhất từng bài so với buổi đầu.'),
        to: '/',
      },
      {
        icon: '↺',
        title: t('Lần trước của từng hiệp'),
        body: t('Ngay trên ô kg: "Lần trước: 27×12 · vừa". Bấm Lặp lại để điền sẵn kg và số lần.'),
      },
      {
        icon: '📷',
        title: t('Ảnh lần trước khi chụp'),
        body: t('Chỉnh ảnh mờ của lần trước Tắt / Mờ / Rõ để đứng đúng tư thế cũ.'),
        to: '/body/photos',
      },
      {
        icon: '🔔',
        title: t('Hỏi bật nhắc nhở ngay lần đầu'),
        body: t('Mở app lần đầu trên máy là app hỏi bật thông báo, không cần tự vào Cài đặt. iPhone chưa thêm vào màn hình chính thì app hướng dẫn cách thêm.'),
        to: '/more/reminders',
      },
      {
        icon: '⬆️',
        title: t('Luôn mở bản mới nhất'),
        body: t('Có bản cập nhật thì app tự cài ngay khi mở, trước cả màn nhập PIN. Đang dùng app mà có bản mới thì vẫn hiện nút Cập nhật (không làm gián đoạn buổi tập).'),
      },
    ],
  },
  {
    id: '2026-10-27b',
    date: '27/10/2026',
    title: t('Phòng tập Matrix'),
    plan: 'v2.5',
    items: [
      {
        icon: '🏋️',
        title: t('9 máy Matrix mới, có hình'),
        body: t('Đá đùi trước, dạng hông, khép đùi, nâng vai ngang, máy kéo xô, dip ngồi, dip trợ lực, gập bụng, xoay thân. Nhóm cơ mới: Đùi trong.'),
        to: '/exercises',
      },
      {
        icon: '🔁',
        title: t('"Kéo xô cáp" và "Máy kéo xô" là 2 bài'),
        body: t('Lat pulldown ở trạm cáp đổi tên thành Kéo xô cáp; máy kéo xô riêng là bài khác, lịch sử tạ không lẫn nhau.'),
      },
      {
        icon: '🩹',
        title: t('Đổi bài không tạo bài trùng'),
        body: t('Gõ đúng tên bài đang đổi (vd. "seated row" khi đang ở Kéo cáp ngồi) thì app báo là cùng một bài, không tạo bài tạm.'),
      },
    ],
  },
  {
    id: '2026-10-27',
    date: '27/10/2026',
    title: 'Personal Trainee',
    plan: 'v2.5',
    items: [
      { icon: '⚡', title: t('Tên mới, mở nhanh hơn'), body: t('App đổi tên Personal Trainee; mở không chớp trắng, từ lần mở thứ 2 nhanh hơn hẳn.') },
      { icon: '🛌', title: t('Nghỉ buổi này'), body: t('Ngày có lịch mà không tập: bấm "Nghỉ buổi này" + lý do. Coach thấy lý do, không tính là buổi hụt.'), to: '/' },
      { icon: '🏋️', title: t('Bài tạ tự do'), body: t('6 bài compound mới (đẩy ngực tạ đơn, đẩy vai tạ đòn, Bulgarian split squat, lunge, deadlift, hip thrust). Không có máy hack squat → Smith squat; bỏ plank.') },
      { icon: '📏', title: t('Số đo gọn hơn'), body: t('Chỉ còn 5 số chính: eo (ngang rốn), hông, ngực, bắp tay, đùi.'), to: '/body' },
      { icon: '📱', title: t('iPhone có Dynamic Island'), body: t('Header không còn dính mép, banner "buổi tập dở" nằm dưới header.') },
    ],
  },
  {
    id: '2026-10-26',
    date: '26/10/2026',
    title: t('Bản đầu tiên'),
    plan: 'v2.4',
    items: [
      { icon: '▶', title: t('Tập từng bước'), body: t('Khởi động → làm nóng → từng hiệp → nghỉ → tổng kết. Ghi kg thực tế kèm lý do, đổi máy, để sau, bỏ bài; thoát giữa chừng vẫn tiếp tục được.') },
      { icon: '✎', title: t('Ghi bù, ghi nhanh'), body: t('Dán ghi chú kiểu tin nhắn ("3x12x27") là tách thành bài + hiệp.'), to: '/training' },
      { icon: '⚖️', title: t('Cân, số đo, InBody, ảnh'), body: t('Biểu đồ với đường mục tiêu; ảnh tiến độ riêng tư, xoá GPS, chỉ anh xem được.'), to: '/body' },
      { icon: '💬', title: t('Review thứ Hai với coach'), body: t('Claude Code đọc tuần tập, gửi lộ trình mới + nhận xét; anh duyệt trong app.'), to: '/more/plans' },
    ],
  },
];

export const LATEST_ID = RELEASES[0].id;

/** `date` is dd/mm/yyyy; shown per locale. */
export function releaseDate(r: WhatsNewRelease): string {
  const [d, m, y] = r.date.split('/');
  return formatVN(`${y}-${m}-${d}`, true);
}

// ── "seen" marker: a per-device convenience (not health data) — localStorage, with an in-memory fallback
const KEY = 'pt.whats-new-seen';
let memory: string | null = null;
const listeners = new Set<() => void>();

function readSeen(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function markWhatsNewSeen(): void {
  memory = LATEST_ID;
  try {
    localStorage.setItem(KEY, LATEST_ID);
  } catch {
    // private mode / blocked storage: the in-memory marker covers this session
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** true while the newest release hasn't been seen on this device */
export function useWhatsNewUnseen(): boolean {
  return useSyncExternalStore(subscribe, () => readSeen() !== LATEST_ID);
}
