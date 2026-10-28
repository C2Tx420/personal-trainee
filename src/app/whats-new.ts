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
