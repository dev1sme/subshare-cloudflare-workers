# Kiến trúc

## Một Worker phục vụ tất cả

Vite build React SPA và Worker cùng lúc; chính Worker đó phục vụ asset tĩnh và xử lý `/api/*` bằng Hono. Một lần deploy, một URL, cùng origin — nên không có CORS, và cookie phiên hoạt động không cần cấu hình thêm.

**Không dùng Cloudflare Pages.** Tài liệu Cloudflare hiện hướng project mới sang Workers static assets (`wrangler deploy`, không phải `wrangler pages deploy`), chi phí asset tĩnh như nhau, và Workers có thêm Cron Triggers — thứ app cần để tự tạo kỳ thanh toán. Tách Pages + Worker là hai lần deploy, hai origin, CORS, và cookie cross-site, không đổi lại được gì.

| Thành phần | Lựa chọn |
|---|---|
| Frontend | React + Vite (SPA), react-router |
| Giao diện | Material 3 Expressive viết tay theo mẫu shadcn/ui (Radix + Tailwind), `motion`; logo dịch vụ từ `simple-icons` ([design-system.md](design-system.md)) |
| Đa ngôn ngữ | `i18next` + `react-i18next` (vi / en) |
| API | Hono trên Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), SQL viết tay, không ORM |
| Đăng nhập | JWT không trạng thái trong cookie `httpOnly`; PBKDF2 qua Web Crypto |
| Thanh toán | VietQR tự sinh, xác nhận thủ công |
| Việc định kỳ | Cron Trigger của chính Worker này |
| Ngôn ngữ | TypeScript |

**Không có gì khác**: không R2, KV, Queues, Durable Objects, dịch vụ ngoài. Ảnh biên lai đã bị bỏ có chủ đích — thành viên bấm "đã chuyển", quản trị viên đối chiếu sao kê rồi xác nhận. Thêm hạ tầng phải có nhu cầu cụ thể, và phải ghi lý do vào đây.

Build và dev chạy qua [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/):

- `npm run dev` chạy Worker trong runtime workerd thật, kèm D1 local và HMR cho client, trong **một process**.
- `assets.directory` **không** khai báo trong `wrangler.jsonc` — plugin tự trỏ vào output build của client. Deploy đọc file `wrangler.json` mà build sinh ra; `wrangler.jsonc` là đầu vào.
- `run_worker_first: ["/api/*"]` cùng `not_found_handling: "single-page-application"`: chỉ `/api/*` vào Worker, mọi đường dẫn khác rơi xuống SPA. Đường dẫn không có trong danh sách **không bao giờ chạy route** — nó nhận `index.html` với status 200. Thêm prefix mới ngoài `/api` (hiếm khi cần) là phải thêm vào đây.
- Cần Wrangler ≥ 4.20 và Vite plugin ≥ 1.7 cho `run_worker_first` dạng mảng.

## Cấu trúc thư mục

Mọi phần đều đã có code: server, migration `0001`–`0009`, test, và client đủ màn cho thành viên (đăng nhập, gói của tôi, khoản + VietQR, khám phá, yêu cầu mở gói) lẫn quản trị viên (thanh toán, yêu cầu, gói + thành viên + kỳ, tài khoản).

```
index.html            entry Vite
public/               copy nguyên vào output client — _headers, favicon.svg
src/client/           React SPA
  main.tsx            provider: ChunkErrorBoundary > BrowserRouter > Motion > Session > Confirm, Toaster
  App.tsx             cổng phiên đăng nhập (chờ /api/auth/me rồi mới render route)
  routes.tsx          bảng route theo vai trò, RequireRole, React.lazy
  api.ts              wrapper có kiểu cho mọi endpoint, trả ApiResult thay vì throw
  errors.ts           mã lỗi API -> câu hiển thị
  format.ts           tiền / ngày / kỳ
  i18n/               index.ts (khởi tạo i18next), locales/vi.ts, en.ts
  lib/                logic thuần phía client: cn, motion (token), period (kỳ giờ VN), providers (logo / màu hãng,
                      gom theo nhà cung cấp), banks (BIN -> tên), initials, wishName
  hooks/              useSession, useConfirm (context + hook, không JSX), useResource, useInFlight
  components/         UI dùng ở hơn một feature; provider có JSX (SessionProvider, ConfirmProvider, MotionProvider)
    ui/               primitive theo mẫu shadcn (button, text-field, select-field, text-area, card, switch,
                      dialog, alert-dialog, sonner)
  layouts/            MemberLayout (kèm WishesProvider), AdminLayout — eager, <Suspense> bên trong
  features/<name>/
    XxxPage.tsx       chỉ ghép component
    components/       UI riêng của feature, mỗi component một file
    useXxx.ts         tải dữ liệu + mutation, không JSX
src/server/           API Hono trên Worker
  index.ts            entry: fetch (Hono) + scheduled (cron), bảng route, guard
  auth.ts             phiên JWT trong cookie, currentUser, requireAdmin / requireMember
  scheduled.ts        việc của Cron Trigger: createDuePeriods
  envelope.ts         ok / failure / notFound — nơi duy nhất gọi c.json
  headers.ts          security header cho /api/*
  validate.ts         validate request viết tay
  routes/             mỗi nhóm tài nguyên một file: auth, accounts, plans (+ members, periods), members, payments,
                      prepayments, joinRequests, wishes, me
  domain/             logic thuần, không import runtime: period.ts, vietqr.ts, code.ts, password.ts, username.ts
  db/                 một module mỗi bảng (users, plans, members, periods, payments, prepayments, joinRequests,
                      wishes) + sql.ts
src/shared/           dùng chung client ↔ server: types.ts (kiểu API), providers.ts (danh sách nhà cung cấp)
scripts/              hash-password.mjs (tạo admin đầu tiên), generate-palette.mjs (sinh token màu)
migrations/           SQL cho D1
test/                 Vitest, chạy trong workerd qua @cloudflare/vitest-plugin
  setup/              apply-migrations.ts (D1 thật cho mỗi file test), env.d.ts
  server/             soi gương src/server/: test/server/routes/plans.test.ts ↔ src/server/routes/plans.ts
```

Test **không** nằm trong `src/`: mọi `*.test.ts` ở `test/`, đường dẫn soi gương file nó kiểm, để `src/` chỉ có code chạy thật. `vitest.config.ts` chỉ nhận `test/**/*.test.ts`. Mỗi file test bắt đầu từ schema thật (mọi migration) và không có dòng nào — storage tách theo file.

README cũ mô tả monorepo `apps/api` + `apps/web` deploy riêng — cấu trúc đó bị thay bằng một package một Worker ở trên.

Route handler validate và quyết định; **không viết SQL** — SQL nằm trong `db/`. Logic thuần (kỳ theo giờ Việt Nam, payload VietQR) nằm trong `domain/` để test được mà không cần database. Không có chia tiền tự động — số tiền do admin đặt ([data-model.md](data-model.md)).

TypeScript chia project reference: client (DOM lib), Worker (type workerd, sinh bằng `wrangler types`), node (`vite.config.ts`). Client **không** import từ `src/server/`, chỉ từ `src/shared/`.

**Mọi thứ trong code đều là tiếng Anh**: URL, thư mục, cột DB, field API, mã lỗi, enum, tên hàm, biến, hook, component, type. Tiếng Việt chỉ nằm ở chữ trên UI. Đặt tên tiếng Việt "cho nội bộ" rồi đổi sau là việc tốn gấp đôi — đừng bắt đầu.

## Phân tầng client

- `*Page.tsx` **ghép** — giữ state cấp màn (modal nào mở, kỳ nào đang chọn) và render component. Không gọi `api.ts`, không chứa JSX của bảng/modal, không `try/catch` quanh request.
- `use*.ts` sở hữu tải dữ liệu và mutation. Mutation trả `Promise<boolean>` và tự bắn toast, nên nơi gọi chỉ quyết định có đóng modal hay không.
- Component trong `features/*/components/` nhận props và callback, **không** import `api.ts`.
- Mutation cập nhật list bằng **hàm** (`setData((current) => …)` của `useResource`), không dựng lại từ `data` bắt được lúc bấm: hai thao tác cùng bay (xác nhận hai dòng liền nhau, bật hai công tắc) mà dùng giá trị cũ thì cái sau xoá mất kết quả của cái trước.
- Dòng đang có request dùng `useInFlight`: kiểm bằng ref (hai cú bấm trong cùng một tick không cùng lọt) và nút của dòng đó bị khoá — bấm đúp chỉ gửi một request.
- Dữ liệu cả khu vực cần (yêu cầu mở gói của thành viên: chấm đỏ ở nav, banner trang chủ, danh sách ở Khám phá) nạp **một lần** trong layout qua provider, không mỗi màn một lần.

Hàm hay mảng truyền vào `useEffect` của component con **phải memo** (`useCallback` / `useMemo`). Không memo thì mỗi lần render tạo tham chiếu mới, effect chạy lại, set state, render lại — vòng lặp vô hạn.

Xác nhận đi qua một hook dialog trong app, **không bao giờ** `window.confirm`: dialog native không style được và chặn cả tab.

Guard phía client chỉ là tiện điều hướng; API mới là nơi ép vai trò. Trang 404 không phân biệt "không có trang này" với "trang của vai trò kia" — nói ra là lộ route quản trị. Vì SPA fallback, Cloudflare trả **200 kèm `index.html`** cho mọi đường dẫn không phải asset, nên 404 là màn client-side.

## Code splitting

Mọi màn sau đăng nhập là một chunk `React.lazy` — ranh giới vai trò là ranh giới chia tự nhiên, thành viên mở trang nợ trên điện thoại không phải tải panel quản trị. Giữ eager: trang login, trang 404, và các layout (lazy layout gây waterfall mà không tiết kiệm gì). `<Suspense>` nằm trong layout để sidebar/header không biến mất khi chunk đang tải.

Router là `<BrowserRouter>` khai báo, **không** phải data router (`createBrowserRouter`): `errorElement` của data router bắt lỗi của `React.lazy` trước khi nó tới error boundary bên dưới.

Tab mở xuyên qua một lần deploy sẽ xin hash chunk không còn tồn tại; SPA fallback trả `index.html`, import fail vì MIME type, React unmount hết thành màn trắng. Một error boundary riêng cho lỗi chunk **reload một lần**, và chỉ hiện nút nếu lỗi lặp lại trong ~10 giây. Lỗi không phải chunk thì ném lại — đây không phải error boundary chung.

## Ngôn ngữ & giao diện

Màu, chữ, kích thước chạm, toast, dialog: [design-system.md](design-system.md).


- Server không tham gia i18n: `message` trong envelope là tiếng Anh cho log; SPA dựng câu từ `error.code`.
- Mặc định **tiếng Việt**, không theo `navigator.language` — điện thoại để tiếng Anh không có nghĩa người dùng muốn đọc app bằng tiếng Anh. Lựa chọn tiếng Anh (khi có nút chuyển) lưu ở `localStorage`, bọc `try/catch`.
- Lỗi mạng (không nhận được envelope) là mã phía client `NETWORK_ERROR`, có câu riêng trong `errors`.
- Ngày hiển thị `dd/mm/yyyy` ở **cả hai** ngôn ngữ.
- Nếu có chế độ sáng/tối: script chọn theme phải inline trong `index.html` và chạy trước lần vẽ đầu, không thì nháy trắng; CSP cho phép nó bằng sha256 (→ [security-headers.md](security-headers.md)).
