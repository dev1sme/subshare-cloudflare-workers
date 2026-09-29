# Mô hình dữ liệu

> **Bản thiết kế, chưa có migration.** Tên bảng và cột dưới đây là đề xuất; migration đầu tiên chốt chúng, và từ đó file này phải khớp migration.

Tên bảng và cột **tiếng Anh**; enum **UPPER_SNAKE tiếng Anh**.

```
users            (id, code, email, display_name, password_hash, role, created_at)
plans            (id, code, name, price, cycle, max_slots, split_mode,
                  bank_bin, bank_account_no, bank_account_name, active, created_at)
plan_members     (id, code, plan_id, user_id, weight, joined_on, left_on)
billing_periods  (id, code, plan_id, period /YYYY-MM/, price, created_at)
payments         (id, code, billing_period_id, user_id, amount, status,
                  marked_at, confirmed_at, confirmed_by)
```

## Ràng buộc

| Ràng buộc | Ý nghĩa |
|---|---|
| `billing_periods UNIQUE(plan_id, period)` | Cron chạy lại, hay admin bấm hai lần, không sinh hai kỳ. Tạo kỳ dùng `INSERT … ON CONFLICT DO NOTHING`, không SELECT-rồi-INSERT (hai lần chạy song song sẽ cùng lọt). |
| `payments UNIQUE(billing_period_id, user_id)` | Mỗi người một khoản mỗi kỳ. |
| `plan_members UNIQUE(plan_id, user_id) WHERE left_on IS NULL` | Một người không ở hai suất đang hoạt động của cùng gói; người đã rời giữ lại làm lịch sử. |
| `users UNIQUE(email)` | Đăng nhập bằng email. |
| `UNIQUE(code)` trên mọi bảng có `code` | Xem dưới. |

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

Tiền tố là thứ chặn việc dùng mã gói ở chỗ cần mã khoản — `parseCode` kiểm tiền tố và hình dạng trước mọi lookup. Sinh bằng `crypto.getRandomValues`, dạng hex in hoa (`0-9A-F`, không O/I/l để gõ nhầm). `payments.code` là **nội dung chuyển khoản**, nên phải ngắn và gõ lại được.

## Enum

| Cột | Giá trị |
|---|---|
| `users.role` | `ADMIN` \| `MEMBER` |
| `plans.cycle` | `MONTHLY` \| `YEARLY` |
| `plans.split_mode` | `EQUAL` \| `CUSTOM` |
| `payments.status` | `UNPAID` \| `PENDING` \| `PAID` |

Đều có CHECK constraint. SQLite không sửa được CHECK, nên đổi giá trị enum là dựng lại bảng trong migration — chọn cẩn thận ngay từ đầu.

## Kiểu dữ liệu

Tiền là `INTEGER` VND. Ngày là `TEXT` ISO. `period` là `YYYY-MM`, tính theo giờ **`Asia/Ho_Chi_Minh`** — Cron Trigger chạy theo UTC, nên 00:30 ngày 1 giờ Việt Nam vẫn là tháng trước theo UTC.

## Chia tiền

```
EQUAL:  base = floor(price / n); r = price - base * n
        r người đầu (theo plan_members.id) nhận base + 1, còn lại nhận base
CUSTOM: share_i = floor(price * weight_i / Σweight); phần dư chia
        theo largest remainder, hoà thì theo plan_members.id
```

Bất biến: **tổng các khoản của một kỳ luôn bằng đúng `billing_periods.price`**. Luật dồn phần dư phải cố định và nằm trong `domain/split.ts` có test, không nằm rải trong route.

## Những điểm thiết kế không được phá

- **Giá và phần tiền được chốt lúc tạo kỳ.** `billing_periods.price` copy từ `plans.price`, `payments.amount` là phần chia lúc đó. Đổi giá gói hay thêm/bớt thành viên chỉ ảnh hưởng kỳ **sau**; không bao giờ tính lại kỳ cũ theo dữ liệu hôm nay.
- **Không có ảnh biên lai, không có cột file.** `PENDING` nghĩa là thành viên tự báo đã chuyển, chưa phải bằng chứng.
- **Seed không chứa dữ liệu thật.** Repo public: migration không được có email, tên hay số tài khoản thật. Admin đầu tiên tạo bằng `scripts/hash-password.mjs` và chạy câu SQL nó in ra, không commit.
