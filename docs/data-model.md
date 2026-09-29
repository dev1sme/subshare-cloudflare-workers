# Mô hình dữ liệu

> Đã chốt bằng `migrations/0001_initial_schema.sql` … `0005_prepayments.sql`. File này phải khớp migration; thay đổi schema là migration mới, không sửa file đã apply.

Tên bảng và cột **tiếng Anh**; enum **UPPER_SNAKE tiếng Anh**.

```
users            (id, code, username, display_name, password_hash, role, created_at)
plans            (id, code, name, price, member_amount, cycle, max_slots, payer_id,
                  bank_bin, bank_account_no, bank_account_name, active, created_at)
plan_members     (id, code, plan_id, user_id, joined_on, left_on)
billing_periods  (id, code, plan_id, period /YYYY-MM/, price, created_at)
payments         (id, code, billing_period_id, user_id, amount, status,
                  marked_at, confirmed_at, confirmed_by, prepayment_id)
prepayments      (id, code, plan_id, user_id, start_period, end_period, months,
                  amount_per_month, amount, status, created_at,
                  marked_at, confirmed_at, confirmed_by)
```

## Vai trò và người thanh toán là hai thứ khác nhau

- **`users.role`** là quyền dùng **hệ thống**: `ADMIN` quản lý gói, tài khoản, xác nhận thanh toán; `MEMBER` chỉ xem và báo đã chuyển cho khoản của mình.
- **`plans.payer_id`** là thuộc tính của **một gói**: người trả tiền dịch vụ cho nhà cung cấp và nhận tiền từ thành viên. Payer **luôn là một `ADMIN`** — hệ thống là của người vận hành, thành viên không đứng tên gói (app kiểm; CHECK không với sang bảng khác). Hạ quyền một admin đang là payer → 409 `USER_IS_PLAN_PAYER`.
- Payer **không có suất** trong `plan_members`, nên không bao giờ có dòng `payments` cho payer — không ai tự chuyển tiền cho chính mình. `max_slots` đếm suất cho **thành viên**, không tính payer (YouTube Family 6 tài khoản → `max_slots = 5`).
- Một user có thể ở **nhiều gói**, mỗi gói tối đa một suất đang hoạt động. User không tự vào gói — admin thêm.

## Ràng buộc

| Ràng buộc | Ý nghĩa |
|---|---|
| `billing_periods UNIQUE(plan_id, period)` | Cron chạy lại, hay admin bấm hai lần, không sinh hai kỳ. Tạo kỳ dùng `INSERT … ON CONFLICT DO NOTHING`, không SELECT-rồi-INSERT (hai lần chạy song song sẽ cùng lọt). |
| `payments UNIQUE(billing_period_id, user_id)` | Mỗi người một khoản mỗi kỳ. |
| `plan_members UNIQUE(plan_id, user_id) WHERE left_on IS NULL` | Một người không ở hai suất đang hoạt động của cùng gói; người đã rời giữ lại làm lịch sử. |
| `users UNIQUE(username)` | Đăng nhập bằng username. Không lưu email: app không gửi mail, nên email chỉ là dữ liệu cá nhân thừa. |
| `UNIQUE(code)` trên mọi bảng có `code` | Xem dưới. |
| `plans.payer_id NOT NULL REFERENCES users` | Mỗi gói có đúng một payer; xoá user đang là payer bị FK chặn. |

Chi tiết đã chốt trong migration:

- Mọi bảng là `STRICT`: sai kiểu (chuỗi vào cột `INTEGER`) bị từ chối thay vì lưu lặng lẽ. Lỗi đó là `SQLITE_CONSTRAINT_DATATYPE` — validate phải chặn trước; lọt tới D1 thì thành 500.
- `users.username`: 3–32 ký tự `a-z 0-9 . _ -`, bắt đầu bằng chữ hoặc số, **lưu chữ thường** (CHECK trong DB, cùng luật với `domain/username.ts`). App trim + hạ chữ thường trước mọi lần ghi và tra, nên `Minh.Anh` và `minh.anh` là một tài khoản.
- `code` có CHECK tiền tố (`substr(code, 1, 2) = 'PL'`, …) — chỉ tiền tố, độ dài và bảng chữ do `parseCode` kiểm.
- `period` có CHECK dạng `YYYY-MM`, tháng `01`–`12`.
- `payments`: `status = 'PAID'` buộc `confirmed_at` và `confirmed_by` khác NULL.
- `plan_members`: `left_on >= joined_on`.
- `price > 0`, `member_amount > 0`, `payments.amount >= 0`, `max_slots >= 1`, `active IN (0, 1)`.
- `created_at` mặc định `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` (UTC).
- `users(role)` có index (migration `0002`) cho chốt "admin cuối" đếm admin mỗi lần hạ quyền / xoá.
- `plans(payer_id)` có index (migration `0003`) cho kiểm "admin này có đang là payer" và cho FK khi xoá user.
- Mọi cột FK có index, để kiểm FK khi xoá bảng cha không quét bảng con. Thêm `billing_periods(period)` cho lọc theo khoảng, `payments(status)` cho danh sách `PENDING`.

Xoá bị chặn bởi FK, không cascade: gói còn kỳ, kỳ còn khoản thanh toán → 409 `RELATED_DATA_EXISTS`. Thành viên rời gói thì đặt `left_on`, không xoá dòng.

## Mã công khai (`code`)

Mọi bảng mà URL có thể trỏ tới có `code` ngẫu nhiên, không suy ra từ `id` — id tuần tự trên URL cho phép dò khoản của người khác bằng cách +1.

| Bảng | Tiền tố |
|---|---|
| `users` | `AC…` |
| `plans` | `PL…` |
| `plan_members` | `MB…` |
| `billing_periods` | `BP…` |
| `payments` | `PM…` |
| `prepayments` | `PP…` |

Tiền tố là thứ chặn việc dùng mã gói ở chỗ cần mã khoản — `parseCode` kiểm tiền tố và hình dạng trước mọi lookup. Sinh bằng `crypto.getRandomValues`, dạng hex in hoa (`0-9A-F`, không O/I/l để gõ nhầm). `payments.code` là **nội dung chuyển khoản**, nên phải ngắn và gõ lại được.

## Enum

| Cột | Giá trị |
|---|---|
| `users.role` | `ADMIN` \| `MEMBER` |
| `plans.cycle` | `MONTHLY` \| `YEARLY` |
| `payments.status`, `prepayments.status` | `UNPAID` \| `PENDING` \| `PAID` |
| `prepayments.months` | `3` \| `6` \| `12` |

Đều có CHECK constraint. SQLite không sửa được CHECK, nên đổi giá trị enum là dựng lại bảng trong migration — chọn cẩn thận ngay từ đầu.

## Kiểu dữ liệu

Tiền là `INTEGER` VND. Ngày là `TEXT` ISO. `period` là `YYYY-MM`, tính theo giờ **`Asia/Ho_Chi_Minh`** — Cron Trigger chạy theo UTC, nên 00:30 ngày 1 giờ Việt Nam vẫn là tháng trước theo UTC.

## Số tiền do admin đặt, không chia tự động

Không có công thức chia. Gói trả bằng USD kèm phí chuyển đổi, và chia đều hay ra số lẻ — nên admin **đặt tay hai con số trên gói**, độc lập với nhau:

- `plans.price` — một chu kỳ tốn payer bao nhiêu VND, **đã gồm phí**. App không quy đổi USD.
- `plans.member_amount` — **mỗi** thành viên đóng bao nhiêu VND **mỗi tháng**. Mọi thành viên của một gói đóng như nhau; số tiền là của gói, không của suất (migration `0004` bỏ `plan_members.amount`).

Ví dụ YouTube Family: `price = 185.500` (gồm phí), `member_amount = 37.000`, 5 thành viên → thu 185.000, payer tự gánh 500.

**Không có bất biến "tổng các khoản = giá gói".** Phần payer tự gánh = `billing_periods.price − Σ payments.amount` của kỳ đó, tính ra khi cần, không lưu. Có thể âm (thu nhiều hơn chi) — app không chặn, chỉ hiển thị.

## Thành viên luôn đóng theo tháng

`plans.cycle` (`MONTHLY` / `YEARLY`) chỉ mô tả **payer trả nhà cung cấp** thế nào — tức `price` là giá tháng hay giá năm. **Thành viên luôn bị tính theo tháng**, với mọi gói: mỗi tháng một kỳ, `member_amount` là số mỗi tháng. Gói năm vì vậy không cần "tháng neo" — cron tạo kỳ hằng tháng cho mọi gói đang dùng. Dashboard quy `price` của gói năm ra tháng (`price / 12`) chỉ để hiển thị.

Thành viên muốn đóng gọn nhiều tháng thì **trả trước** (dưới).

## Trả trước

Một dòng `prepayments` = một thành viên trả trước **3, 6 hoặc 12 tháng** của một gói, **không giảm giá**: `amount = months × amount_per_month`, `amount_per_month` = `plans.member_amount` lúc tạo (CHECK trong DB).

- `start_period` = tháng đầu tiên, tính từ tháng hiện tại (giờ Việt Nam), mà thành viên **chưa trả** (payment không `PAID`/`PENDING`) và **chưa có lệnh trả trước nào phủ**; `end_period = start_period + months − 1`. Các lệnh trả trước của một người trong một gói **không chồng nhau** (app kiểm khi tạo).
- Trạng thái như `payments`: `UNPAID → PENDING` (thành viên báo đã chuyển) `→ PAID` (admin xác nhận), admin trả về được.
- Khi lệnh thành `PAID`: các payment **đã có** trong khoảng đó mà chưa `PAID` → `PAID`, `prepayment_id` trỏ về lệnh, `amount = amount_per_month`. Các kỳ **tạo sau** trong khoảng đó: `createPeriod` tạo payment của người này sẵn `PAID`, cùng `confirmed_at`/`confirmed_by` của lệnh. Lịch sử vì vậy vẫn đủ từng tháng.
- Thành viên rời gói khi còn tháng đã trả: app chỉ hiện số tháng còn lại; hoàn tiền làm ngoài app.

## Ai vào kỳ nào

Khi tạo kỳ `YYYY-MM`: một dòng `payments` cho mỗi suất **còn trong gói vào ngày 1 của kỳ** — `joined_on <= 'YYYY-MM-01' AND (left_on IS NULL OR left_on >= 'YYYY-MM-01')`. `amount` copy từ `plans.member_amount` lúc tạo kỳ.

- Vào ngày 15/10 → đóng từ kỳ `2026-11`.
- Rời ngày 15/10 → vẫn đóng kỳ `2026-10`, không vào kỳ `2026-11`.
- Payer không có suất → không bao giờ có dòng.

Kỳ tạo tay (`POST /api/plans/:code/periods`) hoặc bằng cron, cùng một hàm, idempotent. Cron tạo kỳ cho **mọi** gói đang dùng, `MONTHLY` lẫn `YEARLY`.

## Dựng lại bảng trong migration

SQLite không thêm được cột `NOT NULL REFERENCES` hay bỏ cột có CHECK tại chỗ → phải dựng lại bảng. D1 **không cho tắt `foreign_keys`** trong migration, nên thứ tự "tạo `X_new`, copy, drop `X`, rename" của tài liệu SQLite **hỏng khi bảng có dữ liệu** (`FOREIGN KEY constraint failed`, D1 rollback): `DROP TABLE X` xoá dòng cha, làm bảng con mồ côi, và dòng đã copy vào `X_new` trước đó không được tính là cha quay lại. Thứ tự đúng (xem `0003`):

```sql
PRAGMA defer_foreign_keys = true;
CREATE TABLE X_backup AS SELECT * FROM X;
DROP TABLE X;
CREATE TABLE X (...);                       -- đúng tên cuối
INSERT INTO X (...) SELECT ... FROM X_backup;   -- insert vào X mới gỡ vi phạm deferred
DROP TABLE X_backup;
-- tạo lại index của X
```

Test migration dựng lại bảng **trên DB có dữ liệu**, không chỉ DB rỗng — bản đầu của `0003` chạy được trên DB rỗng và hỏng trên DB có dữ liệu.

## Những điểm thiết kế không được phá

- **Giá và số tiền được chốt lúc tạo kỳ.** `billing_periods.price` copy từ `plans.price`, `payments.amount` copy từ `plans.member_amount` lúc đó. Đổi giá gói, đổi số tiền mỗi người hay thêm/bớt thành viên chỉ ảnh hưởng kỳ **sau**; không bao giờ tính lại kỳ cũ theo dữ liệu hôm nay.
- **Không có ảnh biên lai, không có cột file.** `PENDING` nghĩa là thành viên tự báo đã chuyển, chưa phải bằng chứng.
- **Seed không chứa dữ liệu thật.** Repo public: migration không được có username, tên hay số tài khoản thật. Admin đầu tiên tạo bằng `scripts/hash-password.mjs` và chạy câu SQL nó in ra, không commit.
