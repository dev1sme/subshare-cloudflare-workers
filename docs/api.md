# API

> Toàn bộ bề mặt dưới đây **đã có code**, trừ `/api/dashboard` (còn dự kiến). Khi route đổi, file này phải khớp code.

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
| Payer không phải admin | 400 | `PAYER_MUST_BE_ADMIN` |
| Chỉ có một trong BIN / số tài khoản | 400 | `INCOMPLETE_BANK_DETAILS` |
| Giảm số suất dưới số thành viên đang có | 409 | `SLOTS_BELOW_MEMBERS` |
| Đặt payer là người đang có suất trong gói | 409 | `PAYER_IS_MEMBER` |
| Thêm payer làm thành viên của chính gói | 409 | `PAYER_CANNOT_BE_MEMBER` |
| Gói đã ngừng | 409 | `PLAN_INACTIVE` |
| Gói hết suất | 409 | `PLAN_FULL` |
| Ngày rời trước ngày vào | 400 | `LEFT_BEFORE_JOINED` |
| Kỳ sai dạng hoặc ở tương lai | 400 | `INVALID_PERIOD` |
| Chuyển trạng thái không hợp lệ (đã đổi trước đó) | 409 | `INVALID_STATUS_TRANSITION` |
| Đổi lẻ payment thuộc lệnh trả trước | 409 | `PAYMENT_COVERED_BY_PREPAYMENT` |
| Trả trước chồng lên tháng đã trả / đã phủ | 409 | `PREPAYMENT_OVERLAP` |
| Xoá lệnh trả trước không được phép | 409 | `CANNOT_DELETE_PREPAYMENT` |
| Số tháng trả trước không phải 3/6/12 | 400 | `INVALID_MONTHS` |
| Lỗi khác | 500 | `INTERNAL_ERROR` (lỗi thật chỉ vào `console.error`) |

`handleError` (gắn làm `app.onError`) nhận ra lỗi constraint của D1 chỉ qua chuỗi message (`UNIQUE constraint failed`, …), xét cả `err.cause`. Chữ ký là `failure(c, code, message, status = 400, details = null)` — mã đứng ngay sau `c` để lệnh grep trong `envelop-conventions.md` bắt được mọi mã.

`validate.ts` sinh mã từ tên field snake_case: `requireString(body, "plan_name", 100)` ném `MISSING_PLAN_NAME` / `INVALID_PLAN_NAME` / `TOO_LONG_PLAN_NAME`. Tên field vì thế phải trùng tên field trong body và khoá `fields.<field>` ở locale.

## Đường dẫn

Tài nguyên trỏ bằng **mã công khai**, không bằng id: `/api/plans/PL3C8EA506`. `parseCode(PREFIX, …)` kiểm tiền tố và hình dạng, nên id số hay mã sai loại là 400 `INVALID_CODE` và không tới được lookup. Id vẫn có thể nằm trong body (FK), nhưng không bao giờ trên URL, lịch sử trình duyệt, log hay referrer.

Sub-path tĩnh (`/api/plans/summary`, …) đăng ký **trước** `/:code` — Hono khớp theo thứ tự.

## Tổng quan bề mặt API

### Quản trị (`requireAdmin`)

| Tài nguyên | Route |
|---|---|
| `/api/plans` | `GET /`, `GET /:code`, `POST /`, `PATCH /:code`, `DELETE /:code` |
| `/api/plans/:code/members` | `GET /`, `POST /` |
| `/api/members` | `PATCH /:code` (đặt `left_on`) |
| `/api/plans/:code/periods` | `GET /`, `POST /` (tạo kỳ tay; cùng đường với cron) |
| `/api/payments` | `GET /?status=&period=&plan_code=`, `PATCH /:code` (`PAID` / trả về `UNPAID`) |
| `/api/prepayments` | `GET /?status=`, `PATCH /:code` (`PAID` / trả về `UNPAID`), `DELETE /:code` |
| `/api/accounts` | `GET /`, `POST /`, `PATCH /:code`, `POST /:code/reset-password`, `DELETE /:code` |
| `/api/join-requests` | `GET /?status=`, `POST /:code/approve`, `POST /:code/reject` |
| `/api/dashboard` | `GET /` — **dự kiến** |

Tài khoản có hai chốt: không xoá tài khoản đang đăng nhập (`CANNOT_DELETE_SELF`), không xoá **hay hạ quyền** admin cuối cùng (`LAST_ADMIN_REQUIRED`). Chốt admin cuối nằm **trong chính câu `UPDATE`/`DELETE`** (`… AND (role <> 'ADMIN' OR (SELECT COUNT(*) …) > 1)`), không phải SELECT-rồi-ghi, nên hai admin hạ quyền nhau cùng lúc không thể cùng lọt.

`/api/plans` **đã có code** (`src/server/routes/plans.ts`, `requireAdmin` trong sub-app):

| Route | Body | `data` |
|---|---|---|
| `GET /` | — | `{ plans }` (đang dùng trước, rồi theo tên) |
| `GET /:code` | — | `{ plan }` |
| `POST /` | `name`, `price`, `member_amount`, `cycle`, `max_slots`, `payer_code`, `bank_bin?`, `bank_account_no?`, `bank_account_name?`, `active?` | `{ plan }` — 201 |
| `PATCH /:code` | bất kỳ trường nào ở trên | `{ plan }` |
| `DELETE /:code` | — | `null` |

`plan` = `{ code, name, price, member_amount, cycle, max_slots, active_members, payer: { code, display_name }, bank_bin, bank_account_no, bank_account_name, active, created_at }` — `active` là boolean, không có `id` hay `payer_id`.

- `payer_code` là mã tài khoản (`AC…`) của một **admin**: sai hình dạng hoặc không tồn tại → `INVALID_PAYER_CODE`, không phải admin → `PAYER_MUST_BE_ADMIN`. Đổi payer sang người đang có suất trong chính gói đó → 409 `PAYER_IS_MEMBER`.
- `bank_bin` 6 chữ số (BIN NAPAS), `bank_account_no` 4–19 chữ số; hai trường đặt hoặc xoá **cùng nhau** (`INCOMPLETE_BANK_DETAILS`), vì QR cần cả hai. `null` hoặc `""` là xoá.
- `max_slots` không được nhỏ hơn `active_members` → 409 `SLOTS_BELOW_MEMBERS`.
- `price` (payer trả, gồm phí) và `member_amount` (mỗi thành viên đóng) đều đặt tay, độc lập. Đổi một trong hai chỉ ảnh hưởng kỳ tạo sau đó. Gói còn suất hoặc kỳ không xoá được (`RELATED_DATA_EXISTS`) — đặt `active: false`.

Kỳ thanh toán **đã có code** (`GET`/`POST /api/plans/:code/periods` trong `routes/plans.ts`, `requireAdmin`):

| Route | Body | `data` |
|---|---|---|
| `GET /api/plans/:code/periods` | — | `{ periods }` — mới nhất trước |
| `POST /api/plans/:code/periods` | `period?` (`YYYY-MM`, mặc định tháng hiện tại giờ Việt Nam) | `{ period, created }` — 201 khi vừa tạo, 200 khi đã có |

`period` = `{ code, period, price, payment_count, paid_count, amount_total, amount_paid, created_at }`.

- **Idempotent**: kỳ đã có thì trả nguyên như cũ (`created: false`), **không** tính lại theo giá hay suất hôm nay. Cơ chế: một `db.batch` gồm `INSERT billing_periods … ON CONFLICT DO NOTHING` và các `INSERT payments … SELECT … WHERE bp.code = <mã vừa sinh cho lần gọi này>` — kỳ đã có thì mã mới không khớp dòng nào, không payment nào được chèn.
- Một payment cho mỗi suất có mặt **ngày 1 của kỳ** ([data-model.md](data-model.md#ai-vào-kỳ-nào)), `amount` = `plans.member_amount` đọc trong cùng transaction.
- Kỳ ở tương lai → 400 `INVALID_PERIOD` (sẽ chốt giá và suất của hôm nay cho một tháng chưa bắt đầu). Gói ngừng → 409 `PLAN_INACTIVE`.
- Mã `BP…`/`PM…` sinh bằng Web Crypto trong Worker, không dùng `randomblob()` của SQLite.
- Cron dùng **đúng hàm này** (`createPeriod` trong `db/periods.ts`) — xem [deployment.md](deployment.md).

Thành viên của gói **đã có code** (`GET`/`POST /api/plans/:code/members` trong `routes/plans.ts`, `PATCH /api/members/:code` trong `routes/members.ts`, đều `requireAdmin`):

| Route | Body | `data` |
|---|---|---|
| `GET /api/plans/:code/members` | — | `{ members }` — đang ở trước, rồi theo `joined_on`; gồm cả người đã rời |
| `POST /api/plans/:code/members` | `user_code`, `joined_on?` (mặc định hôm nay giờ Việt Nam) | `{ member }` — 201 |
| `PATCH /api/members/:code` | `left_on` | `{ member }` |

`member` = `{ code, user: { code, username, display_name }, joined_on, left_on }`. Số tiền không nằm trên suất — mọi thành viên đóng `plans.member_amount`.

- Payer của gói không có suất trong gói đó → 409 `PAYER_CANNOT_BE_MEMBER`. Gói `active = false` → 409 `PLAN_INACTIVE`.
- Hết suất → 409 `PLAN_FULL`. Kiểm **trong chính câu `INSERT … SELECT … WHERE COUNT(*) < max_slots`**, nên hai lần thêm song song không cùng lấy suất cuối.
- Một người một suất đang hoạt động mỗi gói → 409 `DUPLICATE_DATA` (partial unique index).
- Rời gói: `left_on` là ngày thật, không trước `joined_on` (`LEFT_BEFORE_JOINED`), không ở tương lai (`INVALID_LEFT_ON`). **Không có "huỷ rời"** — `left_on: null` bị từ chối, vì nó lách được giới hạn suất; quay lại là thêm suất mới. Không có xoá suất: dòng giữ làm lịch sử.
- Thành viên có `role = ADMIN` (admin khác, không phải payer) được thêm vào gói, nhưng `/api/me/*` chỉ nhận `MEMBER` — xem [auth.md](auth.md).

`/api/accounts` **đã có code** (`src/server/routes/accounts.ts`, `requireAdmin` gắn trong sub-app):

| Route | Body | `data` |
|---|---|---|
| `GET /` | — | `{ accounts }` |
| `POST /` | `username`, `display_name`, `role?` (mặc định `MEMBER`), `password?` | `{ account, password }` — 201 |
| `PATCH /:code` | bất kỳ trong `username`, `display_name`, `role` | `{ account }` |
| `POST /:code/reset-password` | `password?` | `{ password }` |
| `DELETE /:code` | — | `null` |

`account` = `{ code, username, display_name, role, created_at }`. `password` (sinh ngẫu nhiên 16 ký tự nếu không gửi) chỉ có trong response tạo/đặt lại — không route nào khác trả nó. Field lạ trong body PATCH bị bỏ qua; không có field hợp lệ nào → 400 `NOTHING_TO_UPDATE`. Username trùng (không phân biệt hoa thường) → 409 `DUPLICATE_DATA`; xoá người còn suất trong gói hay khoản thanh toán → 409 `RELATED_DATA_EXISTS`.

### Thành viên (`requireMember`) — **đã có code** (`routes/me.ts`)

Người dùng lấy từ token; khoản / lệnh của người khác trả **404**, không 403.

| Route | Body | `data` |
|---|---|---|
| `GET /api/me/plans` | — | `{ plans }` — gói mình đang có suất, kèm `member_amount` |
| `GET /api/me/payments` | — | `{ payments }` — chưa trả trước, rồi mới nhất |
| `GET /api/me/payments/:code` | — | `{ payment, bank_transfer }` |
| `POST /api/me/payments/:code/mark-sent` | — | `{ payment }` (`UNPAID → PENDING`) |
| `GET /api/me/prepayments` | — | `{ prepayments }` |
| `POST /api/me/prepayments` | `plan_code`, `months` (3/6/12) | `{ prepayment, bank_transfer }` — 201 |
| `GET /api/me/prepayments/:code` | — | `{ prepayment, bank_transfer }` |
| `POST /api/me/prepayments/:code/mark-sent` | — | `{ prepayment }` |
| `DELETE /api/me/prepayments/:code` | — | `null` (chỉ khi `UNPAID`) |
| `GET /api/me/open-plans` | — | `{ plans }` — gói đang nhận đăng ký mà mình chưa có suất, kèm `pending_request_code` của mình |
| `GET /api/me/join-requests` | — | `{ join_requests }` — của mình, mới nhất trước |
| `POST /api/me/join-requests` | `plan_code`, `note?` (≤ 200) | `{ join_request }` — 201 |
| `POST /api/me/join-requests/:code/cancel` | — | `{ join_request }` (`PENDING → CANCELLED`) |

Xin vào gói: gói không tồn tại, đã ngừng hoặc không nhận đăng ký → 404 `PLAN_NOT_OPEN` (như nhau, không dò được gói ẩn); đã có suất → 409 `ALREADY_MEMBER`; đã có yêu cầu chờ → 409 `JOIN_REQUEST_EXISTS` (bấm đúp lọt qua kiểm → `DUPLICATE_DATA` từ unique index); hết suất → 409 `PLAN_FULL`. Huỷ yêu cầu của người khác → 404.

`bank_transfer` = `{ bank_bin, account_no, account_name, amount, note, qr }` hoặc `null` (đã `PAID`, hoặc gói chưa có ngân hàng). `qr` là payload VietQR để trình duyệt vẽ; `amount` là số nguyên để copy.

### Yêu cầu vào gói — admin (`requireAdmin`) — **đã có code** (`routes/joinRequests.ts`)

| Route | Body / query | `data` |
|---|---|---|
| `GET /api/join-requests` | `?status=` (mặc định `PENDING`) | `{ join_requests }` — `PENDING` cũ nhất trước (ai xin trước duyệt trước), trạng thái khác mới nhất trước; tối đa 200 |
| `POST /api/join-requests/:code/approve` | `joined_on?` (mặc định hôm nay giờ Việt Nam; body tuỳ chọn) | `{ join_request }` — suất được tạo cùng lúc |
| `POST /api/join-requests/:code/reject` | — | `{ join_request }` |

`join_request` = `{ code, plan: { code, name, member_amount, max_slots, active_members }, user: { code, username, display_name }, status, note, created_at, decided_at }`. Duyệt: không còn `PENDING` → 409 `INVALID_STATUS_TRANSITION`; gói ngừng → 409 `PLAN_INACTIVE`; thành viên đã có suất → 409 `ALREADY_MEMBER`; hết suất → 409 `PLAN_FULL` (yêu cầu vẫn `PENDING`). `accepting_requests` (boolean) nằm trong `plan` và nhận qua `POST`/`PATCH /api/plans` (mặc định `false`).

### Thanh toán — admin (`requireAdmin`) — **đã có code** (`routes/payments.ts`, `routes/prepayments.ts`)

| Route | Body / query | `data` |
|---|---|---|
| `GET /api/payments` | `?status=&period=&plan_code=` | `{ payments }` (tối đa 500, mới nhất trước) |
| `PATCH /api/payments/:code` | `status`: `PAID` \| `UNPAID` | `{ payment }` |
| `GET /api/prepayments` | `?status=` | `{ prepayments }` |
| `PATCH /api/prepayments/:code` | `status`: `PAID` \| `UNPAID` | `{ prepayment }` |
| `DELETE /api/prepayments/:code` | — | `null` (không khi `PAID`) |

`payment` = `{ code, plan: { code, name }, user: { code, username, display_name }, period, amount, status, marked_at, confirmed_at, prepayment_code }`. `prepayment` = `{ code, plan, user, start_period, end_period, months, amount_per_month, amount, status, created_at, marked_at, confirmed_at }`.

`GET /api/payments` không filter phải đọc cả bảng `payments` để sắp xếp — dùng `?status=PENDING` / `?period=` (có index) cho màn hằng ngày.

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
