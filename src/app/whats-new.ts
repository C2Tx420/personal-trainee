import { useSyncExternalStore } from 'react';

/**
 * "Có gì mới" — user-facing release notes in Vietnamese, newest first.
 * CHANGELOG.md stays the technical log; add an entry here for every change he can see or use.
 * A new `id` at the top shows the sheet once after the update.
 */
export type WhatsNewItem = { icon: string; title: string; body: string; to?: string };
export type WhatsNewRelease = { id: string; date: string; title: string; plan: string; items: WhatsNewItem[] };

export const RELEASES: WhatsNewRelease[] = [
  {
    id: '2026-11-05',
    date: '05/11/2026',
    title: 'Tên bài tiếng Anh, máy trợ lực',
    plan: 'v2.7',
    items: [
      { icon: '🪢', title: 'Máy trợ lực tính đúng chiều', body: 'Kéo xà / dip trợ lực: kg là trợ lực nên kg thấp hơn mới là khoẻ hơn. Kỷ lục 🏆, "↑ hơn lần trước", gợi ý tạ và thẻ Tiến độ giờ tính đúng chiều; không còn làm nóng theo %. Bài khác cũng là máy trợ lực thì bật "Máy trợ lực" ở trang bài.', to: '/exercises/assisted_pull_up' },
      { icon: '🗂️', title: 'Cảnh báo bản nháp cũ', body: 'Duyệt lộ trình: nếu bản nháp soạn trên lộ trình cũ, hoặc đang có 2 bản nháp chờ, app báo ngay và có nút "Từ chối bản cũ" — không còn duyệt nhầm bản cũ như hôm 01/11.', to: '/more/plans' },
      { icon: '💪', title: 'Hiệp theo nhóm cơ', body: 'Tab Tập có thẻ mới: tuần này mỗi nhóm cơ được bao nhiêu hiệp (nhóm chính 1, nhóm phụ 0,5), vùng xanh 10–20 hiệp là tham khảo, kèm TB 4 tuần trước. Thấy ngay nhóm nào đang thiếu, ví dụ xô hay vai sau.', to: '/training' },
      { icon: '🔥', title: 'Làm nóng nhẹ hơn', body: 'Bài đa khớp làm nóng 2 hiệp ít lần dần: 50% × 8 rồi 75% × 4 (vd. máy đẩy ngực 27 kg → 14 × 8, 18 × 4) thay cho 2 hiệp gần bằng hiệp chính. Coach đổi lộ trình sang kiểu này ở lần review tới. Kg làm nóng luôn nhẹ hơn hiệp chính ít nhất 1 nấc.' },
      { icon: '↕️', title: 'So với lần trước', body: 'Tổng kết buổi và chi tiết buổi có thẻ ↑ = ↓ cho từng hiệp chính so với đúng hiệp đó buổi trước — thấy ngay hiệp nào bị tụt (thường là hiệp cuối).', to: '/training' },
      { icon: '🧐', title: 'Hỏi lại khi gõ số lạ', body: 'Gõ 300 thay vì 30, 120 lần, hay 25 kg trên máy nấc lb → app hỏi lại một lần ("Đúng rồi — lưu" hoặc Sửa) khi bấm Xong hiệp; ghi nhanh / ghi bù hiện cảnh báo vàng ngay dưới hiệp. Không chặn — số đúng thì cứ lưu.' },
      { icon: '📈', title: 'Biểu đồ e1RM', body: 'Tab Tập → Biểu đồ theo bài có thêm nút e1RM: sức mạnh ước tính từ kg × lần, so được cả khi anh đổi tạ hay đổi số lần. Chỉ để xem xu hướng, không phải mức tạ 1 lần thật.', to: '/training' },
      { icon: '🔤', title: 'Tên bài tiếng Anh', body: 'Tất cả bài tập đổi sang tên tiếng Anh như ở phòng tập (vd. Machine Chest Press, Cable Lat Pulldown). Tên tiếng Việt cũ vẫn nằm trong "Tên gọi khác" — gõ tiếng Việt khi tìm, đổi bài hay ghi nhanh vẫn ra đúng bài. Hướng dẫn kỹ thuật giữ tiếng Việt.', to: '/exercises' },
    ],
  },
  {
    id: '2026-11-02.3',
    date: '02/11/2026',
    title: 'Cảm nhận sau buổi tập',
    plan: 'v2.6',
    items: [
      { icon: '📝', title: 'Cảm nhận sau buổi', body: 'Tổng kết buổi có ô ghi cảm nhận (khoẻ / mệt, ngủ, chỗ nào đau…). Quên ghi thì vào chi tiết buổi ghi bù; Lịch sử đánh dấu "Chưa ghi cảm nhận". Coach đọc khi review tuần — tuần đã review thì không sửa được nữa.', to: '/training' },
    ],
  },
  {
    id: '2026-11-02.2',
    date: '02/11/2026',
    title: 'Buổi nhẹ ngày nghỉ, cập nhật bắt buộc',
    plan: 'v2.6',
    items: [
      { icon: '🚶', title: 'Buổi nhẹ ngày nghỉ', body: 'Ngày nghỉ có sẵn đi bộ / zone 2 / core nếu anh muốn vận động. Hôm trước Legs chỉ gợi ý đi bộ hoặc core để giữ chân khoẻ.', to: '/' },
      { icon: '🏸', title: 'Không đánh cầu lông?', body: 'Thẻ cầu lông có "Thay bằng Zone 2 / Đi bộ": tự ghi nghỉ cầu lông kèm lý do và mở màn ghi buổi thay thế (45–50 phút).', to: '/' },
      { icon: '🔒', title: 'Cập nhật bắt buộc', body: 'Mở app hoặc quay lại app mà có bản mới → khoá màn hình và cập nhật ngay, không cần nhập lại PIN nếu anh đang dùng dở. Đang tập thì chờ xong buổi.' },
    ],
  },
  {
    id: '2026-11-02',
    date: '02/11/2026',
    title: 'Lộ trình theo tuần, review gọn hơn',
    plan: 'v2.6',
    items: [
      { icon: '🗓️', title: 'Lộ trình đặt tên theo tuần', body: 'Không còn v1, v2: mỗi lộ trình là "Tuần 2 · Noel". Mỗi mục tiêu (Noel, Tết, Hè) là một giai đoạn, tuần đếm lại từ 1.', to: '/more/plans' },
      { icon: '🔍', title: 'Duyệt lộ trình dễ xem', body: 'Thay đổi gom theo từng buổi: bài mới / bài thay, ↑ tăng tạ / ↓ giảm tạ, lời coach ngay dưới bài; bài không đổi làm mờ; thư viện bài tập thu gọn.' },
      { icon: '💬', title: 'Nhận xét coach dạng thẻ', body: 'Câu tóm tắt ở đầu, từng mục cân / số đo / tập luyện / đề xuất có biểu tượng, ✓ điểm tốt – ⚠ cần chú ý, câu hỏi cho anh nằm trong khung riêng. Bản cũ thu gọn.', to: '/more/reviews' },
      { icon: '🔄', title: 'Tự cập nhật, không còn thanh nhắc', body: 'Có bản mới thì app tự cài lúc mở app hoặc khi anh chuyển sang màn khác (không mất chữ đang gõ), không cài giữa buổi tập. Bỏ thanh "Có phiên bản mới".' },
      { icon: '🏋️', title: 'Máy là chính', body: 'Coach giữ bài chính trên máy, mỗi buổi thêm đúng 1 bài tạ tự do. Có máy hack squat ở phòng tập.' },
    ],
  },
  {
    id: '2026-10-28',
    date: '28/10/2026',
    title: 'Máy Matrix, kỷ lục và tiến độ',
    plan: 'v2.6',
    items: [
      {
        icon: '🎚️',
        title: 'Máy chia nấc lb',
        body: 'Máy Matrix ghi cục tạ bằng lb: bấm nấc 40 / 50 / 60 lb, app ghi 18 / 23 / 27 kg. Nút −/+ nhảy đúng từng nấc. Bật cho máy nào ở trang chi tiết bài → "Máy chia nấc lb".',
        to: '/exercises',
      },
      {
        icon: '🏆',
        title: 'Kỷ lục mới',
        body: 'Tạ nặng nhất từ trước tới giờ, hoặc nhiều lần hơn ở mức tạ đã từng tập — có 🏆 trên hiệp, trong tổng kết buổi và chi tiết buổi.',
        to: '/training',
      },
      {
        icon: '📈',
        title: 'Tiến độ từ 26/10',
        body: 'Thẻ mới ở Hôm nay: cân trung bình tuần, vòng eo, và tạ nặng nhất từng bài so với buổi đầu.',
        to: '/',
      },
      {
        icon: '↺',
        title: 'Lần trước của từng hiệp',
        body: 'Ngay trên ô kg: "Lần trước: 27×12 · vừa". Bấm Lặp lại để điền sẵn kg và số lần.',
      },
      {
        icon: '📷',
        title: 'Ảnh lần trước khi chụp',
        body: 'Chỉnh ảnh mờ của lần trước Tắt / Mờ / Rõ để đứng đúng tư thế cũ.',
        to: '/body/photos',
      },
      {
        icon: '🔔',
        title: 'Hỏi bật nhắc nhở ngay lần đầu',
        body: 'Mở app lần đầu trên máy là app hỏi bật thông báo, không cần tự vào Cài đặt. iPhone chưa thêm vào màn hình chính thì app hướng dẫn cách thêm.',
        to: '/more/reminders',
      },
      {
        icon: '⬆️',
        title: 'Luôn mở bản mới nhất',
        body: 'Có bản cập nhật thì app tự cài ngay khi mở, trước cả màn nhập PIN. Đang dùng app mà có bản mới thì vẫn hiện nút Cập nhật (không làm gián đoạn buổi tập).',
      },
    ],
  },
  {
    id: '2026-10-27b',
    date: '27/10/2026',
    title: 'Phòng tập Matrix',
    plan: 'v2.5',
    items: [
      {
        icon: '🏋️',
        title: '9 máy Matrix mới, có hình',
        body: 'Đá đùi trước, dạng hông, khép đùi, nâng vai ngang, máy kéo xô, dip ngồi, dip trợ lực, gập bụng, xoay thân. Nhóm cơ mới: Đùi trong.',
        to: '/exercises',
      },
      {
        icon: '🔁',
        title: '"Kéo xô cáp" và "Máy kéo xô" là 2 bài',
        body: 'Lat pulldown ở trạm cáp đổi tên thành Kéo xô cáp; máy kéo xô riêng là bài khác, lịch sử tạ không lẫn nhau.',
      },
      {
        icon: '🩹',
        title: 'Đổi bài không tạo bài trùng',
        body: 'Gõ đúng tên bài đang đổi (vd. "seated row" khi đang ở Kéo cáp ngồi) thì app báo là cùng một bài, không tạo bài tạm.',
      },
    ],
  },
  {
    id: '2026-10-27',
    date: '27/10/2026',
    title: 'Personal Trainee',
    plan: 'v2.5',
    items: [
      { icon: '⚡', title: 'Tên mới, mở nhanh hơn', body: 'App đổi tên Personal Trainee; mở không chớp trắng, từ lần mở thứ 2 nhanh hơn hẳn.' },
      { icon: '🛌', title: 'Nghỉ buổi này', body: 'Ngày có lịch mà không tập: bấm "Nghỉ buổi này" + lý do. Coach thấy lý do, không tính là buổi hụt.', to: '/' },
      { icon: '🏋️', title: 'Bài tạ tự do', body: '6 bài compound mới (đẩy ngực tạ đơn, đẩy vai tạ đòn, Bulgarian split squat, lunge, deadlift, hip thrust). Không có máy hack squat → Smith squat; bỏ plank.' },
      { icon: '📏', title: 'Số đo gọn hơn', body: 'Chỉ còn 5 số chính: eo (ngang rốn), hông, ngực, bắp tay, đùi.', to: '/body' },
      { icon: '📱', title: 'iPhone có Dynamic Island', body: 'Header không còn dính mép, banner "buổi tập dở" nằm dưới header.' },
    ],
  },
  {
    id: '2026-10-26',
    date: '26/10/2026',
    title: 'Bản đầu tiên',
    plan: 'v2.4',
    items: [
      { icon: '▶', title: 'Tập từng bước', body: 'Khởi động → làm nóng → từng hiệp → nghỉ → tổng kết. Ghi kg thực tế kèm lý do, đổi máy, để sau, bỏ bài; thoát giữa chừng vẫn tiếp tục được.' },
      { icon: '✎', title: 'Ghi bù, ghi nhanh', body: 'Dán ghi chú kiểu tin nhắn ("3x12x27") là tách thành bài + hiệp.', to: '/training' },
      { icon: '⚖️', title: 'Cân, số đo, InBody, ảnh', body: 'Biểu đồ với đường mục tiêu; ảnh tiến độ riêng tư, xoá GPS, chỉ anh xem được.', to: '/body' },
      { icon: '💬', title: 'Review thứ Hai với coach', body: 'Claude Code đọc tuần tập, gửi lộ trình mới + nhận xét; anh duyệt trong app.', to: '/more/plans' },
    ],
  },
];

export const LATEST_ID = RELEASES[0].id;

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
