# Design system

**Material 3 Expressive**, chốt 2026-09-30 (thay bản Minimalism/Swiss đầu tiên — ba thấy đơn điệu và muốn có animation). Định hướng lấy từ `ui-ux-pro-max` (`--domain style "material 3 expressive"`, design system `--variance 6 --motion 6`), bảng màu sinh bằng thư viện chính thức của Material. Token nằm ở `src/client/index.css` (`@theme` của Tailwind v4); file này giải thích vì sao.

## Định hướng

- **Màu tonal, hình tương phản, chuyển động spring.** Nền không trắng tinh (`surface` #fdf7ff), nâng tầng bằng màu container chứ không bằng bóng đổ.
- **Mobile-first**: thành viên mở app trên điện thoại để chuyển khoản. Màn thành viên một cột (`max-w-lg`).
- Điều hướng: M3 navigation bar ở đáy trên điện thoại (≤ 5 mục), navigation rail từ `md`. Chỉ báo mục đang chọn là một viên thuốc trượt giữa các mục.

## Màu

Sinh một lần bằng `@material/material-color-utilities` (`SchemeVibrant`, seed `#6750A4`, light). `success` / `warning` lấy từ `TonalPalette` hue 145 / 70, chroma 48 (tone 40 / 90 / 30). Đổi seed = chạy lại script sinh rồi thay khối `@theme` — **không** sửa tay từng màu.

| Vai trò | Dùng cho |
|---|---|
| `surface`, `surface-container-{lowest,low,,high,highest}` | nền trang; thẻ (`low`), dialog (`high`), ô trắng quanh QR (`lowest`) |
| `on-surface`, `on-surface-variant`, `outline(-variant)` | chữ / chữ phụ / viền |
| `primary` / `primary-container` | nút chính, link, thẻ tổng nợ (gradient `primary → tertiary`) |
| `secondary-container` | nút tonal, chỉ báo điều hướng |
| `tertiary(-container)` | điểm nhấn: avatar, hình trang trí |
| `error(-container)` | **còn nợ** (`UNPAID`) và thao tác phá huỷ |
| `warning-container` | `PENDING` |
| `success-container` | `PAID` |
| `inverse-surface` | snackbar (toast) |

- Seed tím tách **màu thương hiệu** khỏi **màu trạng thái**: xanh = đã đóng, đỏ = còn nợ, tím không mang nghĩa tiền.
- Contrast đã đo (WCAG): chữ trên `primary` 6.4:1, `on-primary-container` 7.2:1, `on-surface-variant` trên nền 8.9:1, chữ `UNPAID` 7.2:1 — đều ≥ AA.
- Trạng thái thanh toán **không chỉ dựa vào màu**: luôn có chữ và icon.
- Chưa có dark mode (scheme dark sinh được từ cùng seed). Khi thêm: định nghĩa lại cùng biến, script chọn theme inline có sha256 trong CSP ([security-headers.md](security-headers.md)).

## Hình

- Nút và chip: viên thuốc (`rounded-full`). Thẻ: `rounded-card` (28px). Ô nhập: `rounded-field` (16px).
- `PlanAvatar`: mỗi gói một **hình + màu tonal cố định** chọn theo hash của `code` — cùng gói nhìn giống nhau ở mọi màn. Chữ cái đầu, **không bao giờ logo thương hiệu**.
- Hình trang trí (login, thẻ tổng nợ, trạng thái trống) luôn `aria-hidden`; chữ mang toàn bộ nghĩa.

## Chữ

- **Be Vietnam Pro** 400 / 500 / 600 / 700, tự host qua `@fontsource/be-vietnam-pro` (`font-src 'self'`). Thiết kế cho tiếng Việt — dấu chồng (`ệ`, `ợ`) không va nhau.
- Tiêu đề đậm, `tracking-tight`; số tiền lớn (`text-4xl`–`5xl`) là thứ đầu tiên mắt thấy. Cột tiền `tabular-nums`.
- Body 16px, line-height 1.5. Ô nhập `text-base` để Safari iOS không tự zoom.

## Chuyển động

Thư viện `motion` (`motion/react`), nạp qua `<LazyMotion>`: component `m.*` render ngay, gói tính năng (`domMax`, ~19 kB gzip) tải sau lần vẽ đầu. `MotionConfig reducedMotion="user"` + CSS `prefers-reduced-motion` tắt transform khi người dùng yêu cầu.

Token chung ở `src/client/lib/motion.ts` — một nhịp cho cả app:

| Token | Dùng cho |
|---|---|
| `spring` (stiffness 380, damping 30) | thứ di chuyển: hàng, chỉ báo điều hướng, thẻ |
| `springExpressive` (nảy nhẹ) | phần tử nhỏ "đến": badge, dấu check, icon copy — **không** dùng cho danh sách |
| `pageEnter` | màn vào: mờ → rõ + nhô lên 12px, 400ms, easing emphasized-decelerate |
| `listStagger` / `listItem` | hàng lần lượt xuất hiện, cách nhau 50ms |
| CSS `--ease-emphasized*`, `animate-dialog-*` | dialog, scrim, state layer, nút |

- Thoát nhanh hơn vào (~60%): dialog vào 400ms, ra 200ms.
- Mỗi màn chỉ 1–2 chuyển động chính; không animation chạy vòng liên tục (trừ skeleton khi đang tải).
- Kết quả đúng không phụ thuộc animation: trạng thái được đặt thẳng, animation chỉ trình bày nó.
- `motion` đặt style qua CSSOM (`element.style`) nên **không** vi phạm `style-src 'self'` — đã kiểm console trên `vite preview`.

Các chuyển động hiện có: chuyển trang; danh sách xuất hiện lần lượt; thẻ tổng nợ đếm số; badge đổi trạng thái bật ra; icon copy → check; QR hiện dần; dialog phóng từ 92%; báo chuyển xong → dấu check tự vẽ trong một hình tròn; nền login có các hình trôi vào một lần; skeleton shimmer khi tải; nút co 0.97 khi bấm.

## Tương tác

- Vùng chạm tối thiểu **44 × 44px**; nút lớn 56px; mục điều hướng 80px cao trên điện thoại.
- **State layer** (`state-layer` utility): lớp `currentColor` 8% khi hover, 12% khi bấm, thay vì đổi màu nền.
- Focus ring 3px `primary`, luôn nhìn thấy. Nút chỉ có icon có `aria-label`; icon trang trí `aria-hidden`. Icon Lucide SVG, không emoji.
- Ô nhập: M3 outlined text field, **nhãn nổi là `<label>` thật** (không phải placeholder đóng vai nhãn).
- Toast: Sonner, dáng snackbar M3 (`inverse-surface`, ở đáy, trong tầm ngón cái); luôn `toast.success` / `toast.error`.
- Xác nhận: `useConfirm()` → AlertDialog M3 (nút chữ "Huỷ" + nút filled). Focus mặc định vào "Huỷ". Không `window.confirm`.
- Tải dữ liệu: skeleton cùng hình dạng màn thật (không nhảy layout), không spinner giữa màn.
- Form đăng nhập cho dán, `autocomplete` đúng (WCAG 2.2 Accessible Authentication), `method="post"`.

## Component

Viết tay trong `src/client/components/` (CLI `shadcn` cần `npx`, không chạy được ở đây), primitive từ `radix-ui`:

- `ui/button` (`filled`, `tonal`, `outlined`, `text`, `error`, `icon`), `ui/text-field`, `ui/card`, `ui/alert-dialog`, `ui/sonner`.
- `NavBar`, `AppHeader`, `UserAvatar`, `PlanAvatar`, `StatusBadge`, `CopyRow`, `QrCode`, `AnimatedNumber`, `PageTransition`, `EmptyState`, `Skeleton`, `LoadError`.
- `QrCode` là **ngoại lệ duy nhất** dùng hex thô (`#000` / `#fff`): máy quét cần module tối trên nền sáng, bất kể theme.

## Đã loại

| Đề xuất | Lý do bỏ |
|---|---|
| Minimalism & Swiss (bản đầu) | Đúng nhưng đơn điệu; ba chọn M3 Expressive |
| Google Fonts CDN | Vi phạm `font-src 'self'`, lộ IP người dùng cho Google |
| GSAP | `motion` đã có spring, exit và layout animation cho React; không cần thư viện thứ hai |
| Haptic feedback, FAB | Checklist M3 cho Android native; web không có haptic đáng tin, app không có hành động chính đủ lớn cho FAB |
| Logo dịch vụ (YouTube, Netflix…) | Nhãn hiệu của bên khác; dùng `PlanAvatar` chữ cái đầu |
