# API

> Envelope, `validate.ts`, xử lý lỗi và `GET /api/health` đã có code. Phần còn lại của bề mặt là **thiết kế**; khi route được viết, file này phải khớp code.

Mọi route nằm dưới `/api`. Mọi thứ dưới `/api` cần phiên đăng nhập, trừ `/api/health` và `/api/auth/login`.

## Envelope & mã lỗi

Chuẩn envelope, định dạng thuộc tính và quy tắc `error.code` ở [`.claude/rules/envelop-conventions.md`](../.claude/rules/envelop-conventions.md). Cách áp dụng:

- Handler **không bao giờ gọi `c.json` trực tiếp** — đi qua `ok` / `failure` / `notFound` trong `src/server/envelope.ts`. Một chỗ duy nhất dựng response thì không route nào lệch khuôn.
- `data` giữ hình dạng của từng route (`{ plans }`, `{ plan }`), không làm phẳng — `request<T>` trong `api.ts` bóc đúng một lớp.
- `message` là câu tiếng Anh cho log; SPA không hiển thị, mà dựng câu từ `error.code`. `onError` log lỗi thật và trả `INTERNAL_ERROR`.
- **Khác ví dụ chung trong file envelope:** validation giữ **mã cụ thể** (`MISSING_PLAN_NAME`), không dùng `VALIDATION_ERROR`, kèm `details: { "plan_name": ["MISSING_PLAN_NAME"] }`. Mã nghiệp vụ không nêu field thì `details: null`.

| Lỗi | HTTP | Mã |
|---|---|---|
| `ValidationError` | 400 | mã cụ thể (`INVALID_PERIOD`, …) |
| Body không phải JSON object | 400 | `MALFORMED_JSON` |
| D1 UNIQUE | 409 | `DUPLICATE_DATA` |
| D1 FOREIGN KEY | 409 | `RELATED_DATA_EXISTS` |
| D1 CHECK | 400 | `INVALID_DATA` |
| Mã sai tiền tố / không phải code | 400 | `INVALID_CODE` |
| Không tìm thấy | 404 | `NOT_FOUND` |
| Chưa đăng nhập | 401 | `UNAUTHORIZED` |
| Sai vai trò | 403 | `FORBIDDEN` |
| Sai username hoặc mật khẩu (không phân biệt hai trường hợp) | 401 | `INVALID_CREDENTIALS` |
| Mật khẩu mới < 8 ký tự | 400 | `PASSWORD_TOO_SHORT` |
| Đổi mật khẩu, sai mật khẩu hiện tại | 400 | `WRONG_CURRENT_PASSWORD` |
| Thiếu `JWT_SECRET` trên Worker | 503 | `SESSION_NOT_CONFIGURED` |
| PATCH không có field hợp lệ | 400 | `NOTHING_TO_UPDATE` |
| Xoá chính mình | 409 | `CANNOT_DELETE_SELF` |
| Hạ quyền / xoá admin cuối | 409 | `LAST_ADMIN_REQUIRED` |
| Hạ quyền admin đang là payer của gói | 409 | `USER_IS_PLAN_PAYER` |
| Lỗi khác | 500 | `INTERNAL_ERROR` (lỗi thật chỉ vào `console.error`) |

`handleError` (gắn làm `app.onError`) nhận ra lỗi constraint của D1 chỉ qua chuỗi message (`UNIQUE constraint failed`, …), xét cả `err.cause`. Chữ ký là `failure(c, code, message, status = 400, details = null)` — mã đứng ngay sau `c` để lệnh grep trong `envelop-conventions.md` bắt được mọi mã.

`validate.ts` sinh mã từ tên field snake_case: `requireString(body, "plan_name", 100)` ném `MISSING_PLAN_NAME` / `INVALID_PLAN_NAME` / `TOO_LONG_PLAN_NAME`. Tên field vì thế phải trùng tên field trong body và khoá `fields.<field>` ở locale.

## Đường dẫn

Tài nguyên trỏ bằng **mã công khai**, không bằng id: `/api/plans/PL3C8EA506`. `parseCode(PREFIX, …)` kiểm tiền tố và hình dạng, nên id số hay mã sai loại là 400 `INVALID_CODE` và không tới được lookup. Id vẫn có thể nằm trong body (FK), nhưng không bao giờ trên URL, lịch sử trình duyệt, log hay referrer.

Sub-path tĩnh (`/api/plans/summary`, …) đăng ký **trước** `/:code` — Hono khớp theo thứ tự.

## Bề mặt API (dự kiến)

### Quản trị (`requireAdmin`)

| Tài nguyên | Route |
|---|---|
| `/api/plans` | `GET /`, `GET /:code`, `POST /`, `PATCH /:code`, `DELETE /:code` |
| `/api/plans/:code/members` | `GET /`, `POST /` |
| `/api/members` | `PATCH /:code` (đổi `amount`, đặt `left_on`) |
| `/api/plans/:code/periods` | `GET /`, `POST /` (tạo kỳ tay; cùng đường với cron) |
| `/api/payments` | `GET /?status=&period=`, `PATCH /:code` (`PAID` / trả về `UNPAID`) |
| `/api/accounts` | `GET /`, `POST /`, `PATCH /:code`, `POST /:code/reset-password`, `DELETE /:code` |
| `/api/dashboard` | `GET /` |

Tài khoản có hai chốt: không xoá tài khoản đang đăng nhập (`CANNOT_DELETE_SELF`), không xoá **hay hạ quyền** admin cuối cùng (`LAST_ADMIN_REQUIRED`). Chốt admin cuối nằm **trong chính câu `UPDATE`/`DELETE`** (`… AND (role <> 'ADMIN' OR (SELECT COUNT(*) …) > 1)`), không phải SELECT-rồi-ghi, nên hai admin hạ quyền nhau cùng lúc không thể cùng lọt.

`/api/accounts` **đã có code** (`src/server/routes/accounts.ts`, `requireAdmin` gắn trong sub-app):

| Route | Body | `data` |
|---|---|---|
| `GET /` | — | `{ accounts }` |
| `POST /` | `username`, `display_name`, `role?` (mặc định `MEMBER`), `password?` | `{ account, password }` — 201 |
| `PATCH /:code` | bất kỳ trong `username`, `display_name`, `role` | `{ account }` |
| `POST /:code/reset-password` | `password?` | `{ password }` |
| `DELETE /:code` | — | `null` |

`account` = `{ code, username, display_name, role, created_at }`. `password` (sinh ngẫu nhiên 16 ký tự nếu không gửi) chỉ có trong response tạo/đặt lại — không route nào khác trả nó. Field lạ trong body PATCH bị bỏ qua; không có field hợp lệ nào → 400 `NOTHING_TO_UPDATE`. Username trùng (không phân biệt hoa thường) → 409 `DUPLICATE_DATA`; xoá người còn suất trong gói hay khoản thanh toán → 409 `RELATED_DATA_EXISTS`.

### Thành viên (`requireMember`)

`GET /api/me/payments`, `GET /api/me/payments/:code`, `POST /api/me/payments/:code/mark-sent` (`UNPAID → PENDING`). Người dùng lấy từ token; khoản của người khác trả **404**, không 403.

### Chung

`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` (có yêu cầu mật khẩu hiện tại). `GET /api/health` không guard. **Đã có code** (`src/server/routes/auth.ts`).

`/api/auth` mount **không** guard: login/logout công khai, `me` và `change-password` phục vụ cả hai vai trò nên tự gọi `currentUser` và trả 401 khi không có phiên.

| Route | Body | `data` |
|---|---|---|
| `POST /login` | `username`, `password` | `{ user }` + cookie `session` |
| `POST /logout` | — | `null`, cookie hết hạn |
| `GET /me` | — | `{ user }` |
| `POST /change-password` | `current_password`, `new_password` | `null` |

`user` = `{ code, username, display_name, role }` — không bao giờ `id` hay `password_hash`.

## Hiệu năng

Các câu đọc độc lập của một màn đi trong **một** `db.batch()`. Thời gian chờ D1 không tính vào 10 ms CPU, nhưng chuỗi `await` nối tiếp thì kéo dài request và tốn subrequest.

## An toàn SQL

Mọi giá trị tới D1 qua `.bind()`. Chuỗi duy nhất được nội suy vào SQL là hằng cấp file (danh sách cột), placeholder sinh ra (`ids.map(() => "?")`), và tên cột từ `buildSet`.

`buildSet` lấy tên cột từ key của đối số, nên truyền thẳng body request vào là mở lỗ injection. Mọi nơi gọi dựng patch **từng field một** từ allowlist — trong `src/server/` không có `...body`.

`src/server/db/sql.ts`:

- `buildSet(patch)` bỏ qua value `undefined`, giữ `null` (đặt cột về NULL), trả `null` khi không còn gì. Kiểu value là `SqlValue = string | number | null`, nên body request (`Record<string, unknown>`) **không compile** khi truyền vào — hàng rào injection nằm ở kiểu, có test `@ts-expect-error` giữ nó.
- `Where` gom điều kiện lọc tuỳ chọn: `add("period BETWEEN ? AND ?", from, to)` chỉ áp khi **mọi** value có mặt, và throw nếu số `?` lệch số value. Lọc `IS NULL` dùng `addRaw`.
