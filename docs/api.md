# API

> Bề mặt dưới đây là **thiết kế**, chưa có code. Khi route được viết, file này phải khớp code.

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
| D1 UNIQUE | 409 | `DUPLICATE_DATA` |
| D1 FOREIGN KEY | 409 | `RELATED_DATA_EXISTS` |
| D1 CHECK | 400 | `INVALID_DATA` |
| Mã sai tiền tố / không phải code | 400 | `INVALID_CODE` |
| Không tìm thấy | 404 | `NOT_FOUND` |
| Chưa đăng nhập | 401 | `UNAUTHORIZED` |
| Sai vai trò | 403 | `FORBIDDEN` |
| Lỗi khác | 500 | `INTERNAL_ERROR` (lỗi thật chỉ vào `console.error`) |

## Đường dẫn

Tài nguyên trỏ bằng **mã công khai**, không bằng id: `/api/plans/PL3C8EA506`. `parseCode(PREFIX, …)` kiểm tiền tố và hình dạng, nên id số hay mã sai loại là 400 `INVALID_CODE` và không tới được lookup. Id vẫn có thể nằm trong body (FK), nhưng không bao giờ trên URL, lịch sử trình duyệt, log hay referrer.

Sub-path tĩnh (`/api/plans/summary`, …) đăng ký **trước** `/:code` — Hono khớp theo thứ tự.

## Bề mặt API (dự kiến)

### Quản trị (`requireAdmin`)

| Tài nguyên | Route |
|---|---|
| `/api/plans` | `GET /`, `GET /:code`, `POST /`, `PATCH /:code`, `DELETE /:code` |
| `/api/plans/:code/members` | `GET /`, `POST /` |
| `/api/members` | `PATCH /:code` (đổi `weight`, đặt `left_on`) |
| `/api/plans/:code/periods` | `GET /`, `POST /` (tạo kỳ tay; cùng đường với cron) |
| `/api/payments` | `GET /?status=&period=`, `PATCH /:code` (`PAID` / trả về `UNPAID`) |
| `/api/accounts` | `GET /`, `POST /`, `PATCH /:code`, `POST /:code/reset-password`, `DELETE /:code` |
| `/api/dashboard` | `GET /` |

Tài khoản có hai chốt: không xoá tài khoản đang đăng nhập (`CANNOT_DELETE_SELF`), không xoá admin cuối cùng (`LAST_ADMIN_REQUIRED`).

### Thành viên (`requireMember`)

`GET /api/me/payments`, `GET /api/me/payments/:code`, `POST /api/me/payments/:code/mark-sent` (`UNPAID → PENDING`). Người dùng lấy từ token; khoản của người khác trả **404**, không 403.

### Chung

`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` (có yêu cầu mật khẩu hiện tại). `GET /api/health` không guard.

## Hiệu năng

Các câu đọc độc lập của một màn đi trong **một** `db.batch()`. Thời gian chờ D1 không tính vào 10 ms CPU, nhưng chuỗi `await` nối tiếp thì kéo dài request và tốn subrequest.

## An toàn SQL

Mọi giá trị tới D1 qua `.bind()`. Chuỗi duy nhất được nội suy vào SQL là hằng cấp file (danh sách cột), placeholder sinh ra (`ids.map(() => "?")`), và tên cột từ `buildSet`.

`buildSet` lấy tên cột từ key của đối số, nên truyền thẳng body request vào là mở lỗ injection. Mọi nơi gọi dựng patch **từng field một** từ allowlist — trong `src/server/` không có `...body`.
