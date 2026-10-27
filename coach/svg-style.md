# Quy chuẩn vẽ hình minh hoạ bài tập (plan v2.4 §4.7)

Mọi hình — kể cả bài Claude Code thêm sau — phải theo đúng chuẩn này để thư viện đồng bộ.
Hình seed sinh từ `scripts/svg/` (khung xương + tư thế); có thể chạy `npm run svg:build` ở thư mục gốc để xem cách dựng, hoặc viết tay theo cùng cấu trúc.

## Khung

- `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="<tên bài>">`
- Nền: `<rect class="bg" width="320" height="200" rx="12"/>`, đường sàn `y=192`.
- **2 khung**: trái x 0–150 "Bắt đầu", phải x 160–310 "Kết thúc" (nhãn `class="t"` ở y=18), mũi tên tam giác nhỏ giữa 2 khung.
- Người nhìn **nghiêng, mặt sang phải**; bài cần thấy 2 tay (nâng vai bên, pec deck, bay ngược) vẽ **chính diện**.

## Nét & màu (khai báo trong `<style>` của SVG)

| class | dùng cho | sáng | tối |
|---|---|---|---|
| `.bd` | thân người (stroke 9, round) | `#2b3440` | `#d7dde4` |
| `.hd` | đầu (circle r=10) | `#2b3440` | `#d7dde4` |
| `.p` / `.pf` | **nhóm cơ chính** (stroke / fill) | `#e8590c` | giữ nguyên |
| `.s` / `.sf` | nhóm cơ phụ | `#f4a261` | giữ nguyên |
| `.eq` / `.eqf` | dụng cụ (nét / khối) | `#9aa3ad` / `#dde2e8` | `#6b7682` / `#2d343d` |
| `.ar` + `.ah` | mũi tên đứt nét chỉ đường đi của khớp chuyển động nhiều nhất | `#e8590c` | giữ nguyên |

Bắt buộc có `@media (prefers-color-scheme:dark){…}` cho các class đổi màu.
Đoạn thân tô theo nhóm cơ: ngực/lưng/bụng → thân; vai → chấm tròn ở khớp vai; tay trước/sau → cánh tay trên; đùi trước/sau/mông → đùi; bắp chân → cẳng chân.

## Cấm (validator + CHECK trong DB sẽ từ chối)

- `<script>`, thuộc tính `on…=`, `<foreignObject>`, `javascript:`, `<!ENTITY`, `@import`
- link / ảnh ngoài (`href`/`src` chỉ được trỏ `#id`)
- lớn hơn **15 KB** (hình seed ~2–3 KB)

## Kèm theo hình

- `cues`: 3–5 điểm kỹ thuật ngắn, tiếng Việt, câu mệnh lệnh ("Ép bả vai ra sau").
- `common_mistakes`: 2–3 lỗi hay gặp.
- `reference_url` (tuỳ chọn): link video để anh tự mở — app không nhúng.

Kiểm tra: `npm run preview-svg -- <file.svg>` (mở xem trước nền sáng + tối).
