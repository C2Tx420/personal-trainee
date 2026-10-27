# Changelog

Định dạng theo Keep a Changelog, version theo SemVer (xem plan v2.4 §15).

## [Unreleased]

Plan: v2.4 · Migration mới nhất: 20261027000800

### Thêm
- Build mới hoàn toàn dạng React PWA (Vite) + Supabase, thay app Expo cũ.
- Đăng nhập Supabase (1 tài khoản) + PIN 4 số mỗi lần mở app, kiểm tra ở server (secret `APP_PIN`), sai 5 lần → đăng nhập lại.
- Trang Hôm nay: buổi theo lịch, khởi động, đếm ngược mốc mục tiêu, banner lộ trình chờ duyệt / nhận xét coach / cảnh báo Legs–cầu lông.
- Luồng tập từng bước: khởi động có đồng hồ → từng bài, từng hiệp (kg/lần/cảm giác/ghi chú) → nghỉ → tổng kết; ghi kg thực tế kèm lý do; đổi bài gõ tự do (bài tạm); để sau / bỏ bài; tiếp tục khi gián đoạn.
- Ghi bù buổi tập, ghi nhanh bằng chữ, ghi cầu lông / đi bộ / zone 2 / core.
- Thư viện 38 bài tập có hình SVG + điểm kỹ thuật, đánh dấu “không có máy”.
- Cân nặng + số đo + biểu đồ + đường mục tiêu + cảnh báo 2 tuần không giảm; InBody; ảnh tiến độ riêng tư (xoá EXIF, 1080px, signed URL).
- Lộ trình có phiên bản: diff, duyệt (hôm nay / hẹn ngày), từ chối, tự sửa → bản mới.
- Nhắc nhở Web Push, sao lưu / nhập JSON, coach/ cho Claude Code review đầu tuần.
- Seed: hồ sơ, 3 mốc, InBody 26/10, lộ trình v1 (tuần 1, ưu tiên máy), buổi Push 26/10/2026.
