# Design system

**Material 3 Expressive, lấy dịch vụ làm trung tâm**, chốt 2026-09-30. Bản M3 đầu tiên xoay quanh tiền (thẻ gradient tổng nợ, số đếm chạy) nên trông như app ngân hàng; ba muốn nhìn vào là thấy **dịch vụ** — YouTube, Spotify, ai ở gói nào — tiền chỉ là thuộc tính của gói. (Trước đó nữa là bản Minimalism/Swiss — ba thấy đơn điệu.) Định hướng lấy từ `ui-ux-pro-max` (`--domain style "material 3 expressive"`, design system `--variance 6 --motion 6`), bảng màu sinh bằng thư viện chính thức của Material. Token nằm ở `src/client/index.css` (`@theme` của Tailwind v4); file này giải thích vì sao.

## Định hướng

- **Dịch vụ trước, tiền sau.** Trang chủ thành viên là "Gói của tôi": mỗi gói một thẻ có logo, khoản còn mở nằm trong thẻ. Khám phá và trang Gói của admin gộp theo nhà cung cấp.
- **Teal dịu làm màu thương hiệu.** Nền phớt teal rất nhạt, nút và điểm nhấn teal; logo hãng vẫn nổi trên ô trắng. Nâng tầng bằng màu container chứ không bằng bóng đổ.
- **Mobile-first**: thành viên mở app trên điện thoại để chuyển khoản. Màn thành viên một cột (`max-w-lg`).
- Điều hướng: M3 navigation bar ở đáy trên điện thoại (≤ 5 mục), navigation rail từ `md`. Chỉ báo mục đang chọn là một viên thuốc trượt giữa các mục.

## Màu

Sinh bằng `scripts/generate-palette.mjs` (`@material/material-color-utilities`, `SchemeTonalSpot`, seed `#00796B`, light — cách chạy ở đầu file). Ba chọn 2026-09-30 từ trang so sánh 4 tông (teal, xanh dương, indigo, fuchsia) × 2 mức (Vibrant đậm / TonalSpot dịu); đã bỏ tím và các tông trùng màu trạng thái (đỏ, cam, xanh lá). `primary` = #006b5e. `success` / `warning` lấy từ `TonalPalette` hue 145 / 70, chroma 48 (tone 40 / 90 / 30). Đổi seed hay scheme = sửa script, chạy lại, thay khối màu trong `@theme` — **không** sửa tay từng màu.

| Vai trò | Dùng cho |
|---|---|
| `surface`, `surface-container-{lowest,low,,high,highest}` | nền trang; thẻ (`low`), dialog (`high`), ô trắng quanh QR (`lowest`) |
| `on-surface`, `on-surface-variant`, `outline(-variant)` | chữ / chữ phụ / viền |
| `primary` / `primary-container` | nút chính, link |
| `secondary-container` | nút tonal, chỉ báo điều hướng |
| `tertiary(-container)` | điểm nhấn nhỏ: viền ghi chú của thành viên |
| `error(-container)` | **còn nợ** (`UNPAID`) và thao tác phá huỷ |
| `warning-container` | `PENDING` |
| `success-container` | `PAID` |
| `inverse-surface` | snackbar (toast) |

- **Màu trạng thái** tách khỏi màu thương hiệu: xanh lá = đã đóng, đỏ = còn nợ, cam = chờ xác nhận; `primary` (teal) không mang nghĩa tiền. Teal khá gần xanh lá `success` — vì vậy badge trạng thái **luôn có chữ và icon**, không bao giờ chỉ là một chấm màu.
- Contrast đã đo (WCAG, 2026-09-30): chữ trên `primary` 6.4:1, `primary` trên nền 6.1:1, `on-surface-variant` trên nền 8.9:1 (trên thẻ 8.4:1), chữ trên `secondary-container` 7.3:1, chữ trong badge `UNPAID` / `PENDING` / `PAID` 7.2 / 7.3 / 7.2:1, chữ `success` trên thẻ 5.9:1 — đều ≥ AA.
- Logo hãng trên ô trắng có thể thấp (Spotify 1.9:1, Duolingo 2.1:1): chấp nhận vì logo là trang trí, tên luôn đi kèm — không bao giờ để logo một mình mang nghĩa.
- Trạng thái thanh toán **không chỉ dựa vào màu**: luôn có chữ và icon.
- Chưa có dark mode (scheme dark sinh được từ cùng seed). Khi thêm: định nghĩa lại cùng biến, script chọn theme inline có sha256 trong CSP ([security-headers.md](security-headers.md)).

## Logo SubShare

- **Chữ S có hai đầu là mũi tên, trên ô teal** (kiểu icon app). Chữ S = "Sub + Share"; hai mũi tên = gia hạn hằng tháng, hai phía cùng góp. Nửa trên `on-primary`, nửa dưới `primary-container`, nền `primary`, bo 9/32. Component `BrandLogo` (header, trang login).
- Có ô nền vì chữ S trơn màu mực biến mất trên tab tối; bản có ô đọc được trên cả tab sáng lẫn tối, và dùng luôn làm favicon.
- Favicon `public/favicon.svg`: cùng hình; file ảnh nên màu viết thẳng hex, **đổi palette thì sửa tay ba màu trong file này**.
- Ba chọn 2026-09-30 qua ba vòng so sánh (chia phần / vòng lặp / chữ S / thẻ xếp quạt / vé xé đôi → chữ S → ghép chữ S với mũi tên của phương án vòng lặp), xem ở 16 / 32 / 64 / 128px, trên header và trên tab sáng / tối.

## Hình

- Nút và chip: viên thuốc (`rounded-full`). Thẻ: `rounded-card` (28px). Ô nhập: `rounded-field` (16px).
- **Không có hình trang trí.** Không blob, không hình tròn trôi nền. Màn trống dùng một icon Lucide nói đúng chủ đề (`EmptyState icon="plans" | "explore" | …`).

## Logo dịch vụ

- `ServiceLogo`: logo hãng **màu của hãng trên ô trắng**, bo như icon app (`rounded-2xl`). Chọn theo `plans.provider` (`docs/data-model.md#nhà-cung-cấp-của-gói`), không theo tên gói.
- Path SVG lấy từ package `simple-icons` (CC0), **bundle vào app** — không tải từ CDN (`img-src 'self'`), import từng icon nên chỉ icon dùng tới vào bundle. Bảng provider → logo / màu / tên ở `src/client/lib/providers.ts`.
- Hãng đã yêu cầu Simple Icons gỡ logo (Microsoft, OpenAI, Canva) → chữ cái đầu trên màu hãng. `OTHER` → chữ cái đầu của tên gói trên `secondary-container`.
- Logo là **trang trí** (`aria-hidden`): tên gói hay tên hãng bên cạnh luôn mang nghĩa. Dùng logo chỉ để nhận ra dịch vụ, trong app private — [Suy luận] rủi ro nhãn hiệu thấp; không dùng logo làm thương hiệu của app.
- Màu hex của hãng là ngoại lệ thứ hai (sau `QrCode`) được dùng hex thô: đặt qua thuộc tính SVG / CSSOM, không vi phạm `style-src 'self'`.

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

Chuyển động **gắn với nội dung**, không có hình trang trí chuyển động:

- **Logo bay từ thẻ gói sang màn thanh toán** (shared layout, `layoutId` = `planLogoId(code)`). Link mang `state.plan` để màn chi tiết vẽ header ngay, logo có chỗ đáp trước khi request trả về. Mỗi màn chỉ một phần tử mang một `layoutId` — hàng lịch sử không dùng.
- **Badge trạng thái morph**: viên thuốc đổi độ rộng theo nhãn mới (`layout`), màu chuyển bằng CSS, nhãn mới trượt lên. Nhãn cũ biến mất ngay, không có animation thoát.
- Danh sách và nhóm nhà cung cấp xuất hiện lần lượt; hàng logo ở login vào lần lượt một lần.
- Icon copy → check; QR hiện dần; dialog phóng từ 92%; skeleton shimmer khi tải; nút co 0.97 khi bấm.

**Không dùng `AnimatePresence mode="popLayout"`**: nó chèn thẻ `<style>` lúc chạy để rút phần tử đang thoát ra khỏi layout; CSP `style-src 'self'` chặn thẻ đó, nên hai phần tử cùng nằm trong layout (badge từng rộng gấp đôi với cả hai nhãn). Dùng hoán đổi chỉ-có-vào (đổi `key`, `initial` khi đổi) hoặc `mode="wait"`.

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
- `NavBar`, `AppHeader`, `BrandLogo`, `UserAvatar`, `ServiceLogo`, `ProviderSection`, `StatusBadge`, `CopyRow`, `QrCode`, `PageTransition`, `EmptyState`, `Skeleton`, `LoadError`.
- Hex thô chỉ ở hai chỗ: `QrCode` (`#000` / `#fff` — máy quét cần module tối trên nền sáng) và `ServiceLogo` (màu hãng).

## Đã loại

| Đề xuất | Lý do bỏ |
|---|---|
| Minimalism & Swiss (bản đầu) | Đúng nhưng đơn điệu; ba chọn M3 Expressive |
| Google Fonts CDN | Vi phạm `font-src 'self'`, lộ IP người dùng cho Google |
| GSAP | `motion` đã có spring, exit và layout animation cho React; không cần thư viện thứ hai |
| Haptic feedback, FAB | Checklist M3 cho Android native; web không có haptic đáng tin, app không có hành động chính đủ lớn cho FAB |
| `PlanAvatar` chữ cái đầu + hình tonal theo hash | Không cho biết là dịch vụ nào; thay bằng `ServiceLogo` (2026-09-30) |
| Thẻ gradient tổng nợ đếm số, dấu check tự vẽ trong hình tròn, nền login có hình trôi | Làm app trông như app ngân hàng / trang trí vô nghĩa; thay bằng hai con số gọn ("Cần chuyển" / "Chờ xác nhận") và badge morph |
| Logo hai ô vuông chồng nhau | Không nói lên điều gì; thay bằng chữ S + mũi tên |
| Chữ S trơn không nền; vòng lặp mũi tên đứng riêng | Chữ S trơn chìm trên tab tối; vòng lặp trông như icon "refresh" có sẵn — ghép hai ý vào một hình trên ô teal |
| Khung trung tính (`SchemeNeutral`, seed tím) | Ba muốn màu chủ đạo rõ hơn; chọn teal dịu |
| Logo từ CDN / `img.logo.dev` | Vi phạm `img-src 'self'`, lộ IP người dùng cho bên thứ ba |
