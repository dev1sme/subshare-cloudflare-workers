# Design system

Nguồn: sinh bằng `ui-ux-pro-max` (`"fintech bill splitting payment tracker mobile" --design-system --variance 3 --motion 3 --density 5`) ngày 2026-09-30, rồi **sửa tay** những chỗ không hợp app này (xem [Đã loại khỏi kết quả sinh](#đã-loại-khỏi-kết-quả-sinh)). Token nằm ở `src/client/index.css` (`@theme` của Tailwind v4); file này giải thích vì sao.

## Định hướng

- **Minimalism / Swiss**: nền sáng, nhiều khoảng trắng, phân cấp bằng chữ, không gradient, không 3D, bóng đổ chỉ cho dialog.
- **Mobile-first**: thành viên mở app trên điện thoại để chuyển khoản. Màn thành viên một cột (`max-w-lg`), không có menu phải học.
- Admin: thanh tab dưới đáy trên điện thoại (≤ 5 mục, trong tầm ngón cái), sidebar từ `md` trở lên.

## Màu

Component dùng **tên token**, không bao giờ hex thô (`bg-primary`, `text-owed`, không `bg-[#047857]`).

| Token | Giá trị | Dùng cho |
|---|---|---|
| `background` / `foreground` | `#f8fafc` / `#0f172a` | nền trang / chữ |
| `card` | `#ffffff` | thẻ, header, dialog |
| `muted` / `muted-foreground` | `#f1f5f9` / `#475569` | nền phụ / chữ phụ (7.5:1 trên trắng) |
| `border` / `input` | `#e2e8f0` / `#cbd5e1` | viền thẻ / viền ô nhập |
| `primary` | `#047857` (emerald-700) | nút chính, link, focus ring |
| `destructive` | `#b91c1c` | xoá, thao tác không hoàn tác |
| `owed` / `pending` / `paid` (+ `-soft`) | đỏ / hổ phách / xanh | trạng thái `UNPAID` / `PENDING` / `PAID` |

- **Xanh = đã đóng, đỏ = còn nợ.** Vì thế đỏ không bao giờ là màu nút kêu gọi hành động — chỉ nợ và thao tác phá huỷ.
- Chữ trắng trên `primary` đạt ~5.5:1 (AA). Kết quả sinh đề xuất `#059669` (emerald-600) — chỉ ~3.8:1 với chữ trắng, trượt AA cho chữ thường.
- Trạng thái thanh toán **không chỉ dựa vào màu**: luôn kèm chữ (và icon nếu có).
- Chưa có dark mode. Khi thêm: định nghĩa lại cùng các biến, và script chọn theme inline phải có sha256 trong CSP ([security-headers.md](security-headers.md)).

## Chữ

- **Be Vietnam Pro** 400 / 500 / 600, tự host qua `@fontsource/be-vietnam-pro` (`font-src 'self'`). Thiết kế cho tiếng Việt — dấu chồng (`ệ`, `ợ`) không va nhau. Mỗi weight khai báo subset `vietnamese` / `latin-ext` / `latin` bằng `unicode-range`; trình duyệt chỉ tải subset trang dùng.
- Body 16px, line-height 1.5. Ô nhập `text-base` (16px) để Safari iOS không tự zoom khi focus.
- Cột tiền dùng `tabular-nums` để chữ số thẳng hàng.

## Tương tác

- Vùng chạm tối thiểu **44 × 44px** (`min-h-11`, nút icon `w-11`). Tab dưới đáy cao 56px.
- Mọi thứ bấm được có `cursor-pointer`, hover đổi màu trong 200ms, và **focus ring nhìn thấy được** (`outline-ring`). Không bao giờ xoá outline mà không thay thế.
- Nút chỉ có icon phải có `aria-label`. Icon trang trí có `aria-hidden`. Icon là SVG Lucide, không emoji.
- `prefers-reduced-motion`: mọi animation/transition gần như tắt (`index.css`).
- Toast: Sonner, luôn `toast.success` / `toast.error`, không `toast()` trơn. Hiện ở giữa phía trên.
- Xác nhận: `useConfirm()` → AlertDialog (Hủy + Đồng ý; `destructive: true` cho nút đỏ). Không `window.confirm`.
- Form đăng nhập cho dán và dùng `autocomplete="username"` / `"current-password"` để trình quản lý mật khẩu hoạt động (WCAG 2.2 Accessible Authentication).

## Component

- `StatusBadge`: nền nhạt + chữ + icon cho `UNPAID` / `PENDING` / `PAID`.
- `CopyRow`: mỗi dòng chuyển khoản một nút copy thật (44px), `value` tách khỏi `display` — tiền copy số nguyên.
- `QrCode`: **ngoại lệ duy nhất** được dùng hex thô (`#000` / `#fff`) — máy quét cần module tối trên nền sáng, bất kể theme.
- `LoadError`: trạng thái lỗi tải tại chỗ, có "Thử lại" (trừ `NOT_FOUND`).


Viết tay theo mẫu shadcn/ui trong `src/client/components/ui/` (CLI `shadcn` cần `npx`, không chạy được ở đây): `button`, `input`, `label`, `card`, `alert-dialog`, `sonner`. Primitive từ gói hợp nhất `radix-ui`. Thêm component mới thì theo cùng mẫu: `cn()` + token, không hex.

## Đã loại khỏi kết quả sinh

| Đề xuất | Lý do bỏ |
|---|---|
| Pattern "Product Demo + Features" | Bố cục landing page; đây là app sau đăng nhập |
| Google Fonts CDN (Calistoga + Inter) | Vi phạm `font-src 'self'`, lộ IP người dùng cho Google; serif hiển thị không hợp app tiền |
| Accent/CTA đỏ `#DC2626` | Trùng nghĩa "còn nợ" |
| Primary `#059669` với chữ trắng | Contrast ~3.8:1, dưới AA |
| GSAP scroll reveal | Thêm thư viện cho hiệu ứng app này không cần; CSS transition là đủ |
