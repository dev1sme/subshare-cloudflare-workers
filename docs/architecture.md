# Kiến trúc

## Một Worker phục vụ tất cả

Vite build React SPA và Worker cùng lúc; chính Worker đó phục vụ asset tĩnh và xử lý `/api/*` bằng Hono. Một lần deploy, một URL, cùng origin — nên không có CORS, và cookie phiên hoạt động không cần cấu hình thêm.

**Không dùng Cloudflare Pages.** Tài liệu Cloudflare hiện hướng project mới sang Workers static assets (`wrangler deploy`, không phải `wrangler pages deploy`), chi phí asset tĩnh như nhau, và Workers có thêm Cron Triggers — thứ app cần để tự tạo kỳ thanh toán. Tách Pages + Worker là hai lần deploy, hai origin, CORS, và cookie cross-site, không đổi lại được gì.

| Thành phần | Lựa chọn |
|---|---|
| Frontend | React + Vite (SPA), react-router |
| Giao diện | shadcn/ui (Radix + Tailwind) |
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

## Cấu trúc thư mục (dự kiến)

```
index.html            entry Vite
public/               copy nguyên vào output client — _headers, favicon
src/client/           React SPA
  App.tsx             cổng phiên đăng nhập
  routes.tsx          bảng route theo vai trò
  api.ts              wrapper có kiểu cho mọi endpoint
  errors.ts           mã lỗi API -> câu hiển thị
  format.ts           tiền / ngày / kỳ
  i18n/locales/       vi.ts, en.ts
  hooks/              useResource, useConfirm, …
  components/         UI dùng ở hơn một feature
  features/<name>/
    XxxPage.tsx       chỉ ghép component
    components/       UI riêng của feature, mỗi component một file
    useXxx.ts         tải dữ liệu + mutation, không JSX
src/server/           API Hono trên Worker
  index.ts            entry: fetch (Hono) + scheduled (cron), bảng route, guard
  auth.ts             băm/verify mật khẩu, JWT, middleware vai trò
  envelope.ts         ok / failure / notFound — nơi duy nhất gọi c.json
  headers.ts          security header cho /api/*
  validate.ts         validate request viết tay
  routes/             mỗi nhóm tài nguyên một file
  domain/             logic thuần: period.ts, vietqr.ts, code.ts, password.ts, username.ts
  db/                 một module mỗi bảng + sql.ts
src/shared/types.ts   kiểu API dùng chung client ↔ server
scripts/              hash-password.mjs (tạo admin đầu tiên)
migrations/           SQL cho D1
```

README cũ mô tả monorepo `apps/api` + `apps/web` deploy riêng — cấu trúc đó bị thay bằng một package một Worker ở trên.

Route handler validate và quyết định; **không viết SQL** — SQL nằm trong `db/`. Logic thuần (kỳ theo giờ Việt Nam, payload VietQR) nằm trong `domain/` để test được mà không cần database. Không có chia tiền tự động — số tiền do admin đặt ([data-model.md](data-model.md)).

TypeScript chia project reference: client (DOM lib), Worker (type workerd, sinh bằng `wrangler types`), node (`vite.config.ts`). Client **không** import từ `src/server/`, chỉ từ `src/shared/`.

**Mọi thứ trong code đều là tiếng Anh**: URL, thư mục, cột DB, field API, mã lỗi, enum, tên hàm, biến, hook, component, type. Tiếng Việt chỉ nằm ở chữ trên UI. Đặt tên tiếng Việt "cho nội bộ" rồi đổi sau là việc tốn gấp đôi — đừng bắt đầu.

## Phân tầng client

- `*Page.tsx` **ghép** — giữ state cấp màn (modal nào mở, kỳ nào đang chọn) và render component. Không gọi `api.ts`, không chứa JSX của bảng/modal, không `try/catch` quanh request.
- `use*.ts` sở hữu tải dữ liệu và mutation. Mutation trả `Promise<boolean>` và tự bắn toast, nên nơi gọi chỉ quyết định có đóng modal hay không.
- Component trong `features/*/components/` nhận props và callback, **không** import `api.ts`.

Hàm hay mảng truyền vào `useEffect` của component con **phải memo** (`useCallback` / `useMemo`). Không memo thì mỗi lần render tạo tham chiếu mới, effect chạy lại, set state, render lại — vòng lặp vô hạn.

Xác nhận đi qua một hook dialog trong app, **không bao giờ** `window.confirm`: dialog native không style được và chặn cả tab.

Guard phía client chỉ là tiện điều hướng; API mới là nơi ép vai trò. Trang 404 không phân biệt "không có trang này" với "trang của vai trò kia" — nói ra là lộ route quản trị. Vì SPA fallback, Cloudflare trả **200 kèm `index.html`** cho mọi đường dẫn không phải asset, nên 404 là màn client-side.

## Code splitting

Mọi màn sau đăng nhập là một chunk `React.lazy` — ranh giới vai trò là ranh giới chia tự nhiên, thành viên mở trang nợ trên điện thoại không phải tải panel quản trị. Giữ eager: trang login, trang 404, và các layout (lazy layout gây waterfall mà không tiết kiệm gì). `<Suspense>` nằm trong layout để sidebar/header không biến mất khi chunk đang tải.

Tab mở xuyên qua một lần deploy sẽ xin hash chunk không còn tồn tại; SPA fallback trả `index.html`, import fail vì MIME type, React unmount hết thành màn trắng. Một error boundary riêng cho lỗi chunk **reload một lần**, và chỉ hiện nút nếu lỗi lặp lại trong ~10 giây. Lỗi không phải chunk thì ném lại — đây không phải error boundary chung.

## Ngôn ngữ & giao diện

- Server không tham gia i18n: `message` trong envelope là tiếng Anh cho log; SPA dựng câu từ `error.code`.
- Mặc định **tiếng Việt**, không theo `navigator.language` — điện thoại để tiếng Anh không có nghĩa người dùng muốn đọc app bằng tiếng Anh.
- Ngày hiển thị `dd/mm/yyyy` ở **cả hai** ngôn ngữ.
- Nếu có chế độ sáng/tối: script chọn theme phải inline trong `index.html` và chạy trước lần vẽ đầu, không thì nháy trắng; CSP cho phép nó bằng sha256 (→ [security-headers.md](security-headers.md)).
