# Đăng nhập & phân quyền

Không dùng framework auth, không bảng session. **Không trạng thái.**

## Vai trò

| Vai trò | `users.role` | Quyền |
|---|---|---|
| Quản trị | `ADMIN` | Gói, thành viên, kỳ, xác nhận thanh toán, tài khoản |
| Thành viên | `MEMBER` | Xem khoản của mình, báo "đã chuyển" |

Không có đăng ký tự do, không xác minh email, không "quên mật khẩu" qua email — admin tạo tài khoản và đặt lại mật khẩu. Không gửi email nghĩa là không cần dịch vụ ngoài.

## Middleware & bố cục route

Hai middleware, mỗi vai trò một cái: `requireAdmin`, `requireMember`. **Không có `requireAuth` chung** — mỗi route cần đăng nhập thuộc đúng một vai trò, nên guard chỉ kiểm "đã đăng nhập" là guard không ai dùng đúng. Hai middleware tự kiểm phiên, không ghép nhau; phần dùng chung là `currentUser`, và nó không từ chối gì.

**Mỗi mount mang guard riêng trên prefix riêng.** Không có middleware wildcard `/api/*`: nó biến thứ tự đăng ký thành thứ quyết định phân quyền — route thêm vào bên dưới tự dưng trả 401 mà file không giải thích. Thêm route là chọn guard, không phải chọn số dòng.

`/api/me/*` **luôn lấy user từ token**, không bao giờ từ request, và trả **404 (không phải 403)** cho tài nguyên của người khác để không dò được mã.

## Phiên

- Đăng nhập đúng → ký JWT HS256 (`sub`, `role`) bằng `JWT_SECRET` → cookie `session`: `httpOnly`, `secure`, `sameSite=Lax`, hạn 7 ngày.
- **Không** để token trong `localStorage` (script nào chạy được trên trang là đọc được) và không trên URL.
- Không trạng thái nên đặt lại mật khẩu **không đá phiên cũ** — JWT cũ sống tới khi hết hạn. Chấp nhận ở quy mô này; muốn sửa cần cột token version và một lần tra DB mỗi request.

Đã có code (`src/server/auth.ts`, `routes/auth.ts`, `domain/password.ts`):

- `sub` của JWT là `users.code`, không phải `id` — payload JWT đọc được bằng base64, và id không bao giờ rời server.
- Guard chỉ tin token, không tra DB mỗi request: đổi vai trò hay xoá tài khoản có hiệu lực khi token hết hạn. `GET /api/auth/me` thì tra DB, nên tài khoản đã xoá thấy 401 ở đó.
- Thiếu `JWT_SECRET` → 503 `SESSION_NOT_CONFIGURED` từ mọi chỗ đọc phiên, kể cả khi request không có cookie.
- `requireMember` **chỉ** nhận `MEMBER`; admin gọi `/api/me/*` bị 403.

## Mật khẩu

`users.password_hash` dạng `pbkdf2$sha256$<iterations>$<salt_b64>$<hash_b64>`. Số vòng nằm trong bản ghi, nên tăng về sau là băm lại + `UPDATE`, không cần migration.

**Plaintext không bao giờ được lưu và không đọc lại được.** Mật khẩu (tối thiểu 8 ký tự, `PASSWORD_TOO_SHORT`) sinh ra hoặc tự chọn chỉ trả **đúng một lần** trong response tạo/đặt lại, kèm nút copy. Không endpoint, cột hay dòng log nào giữ plaintext, kể cả khi có ai xin tính năng "xem mật khẩu" — đặt lại cho cùng khả năng mà không mang rủi ro; người ta dùng lại mật khẩu ở chỗ khác.

- **Tự đổi** (`POST /api/auth/change-password`) **có** yêu cầu mật khẩu hiện tại — cookie phiên trên một thiết bị bị bỏ quên không được đủ để khoá chủ thật ra ngoài.
- **Admin đặt lại** **không** yêu cầu.

Băm bằng Web Crypto (`crypto.subtle`) trong Worker, không Node `crypto`. So sánh bằng hàm so byte thời gian hằng. Token, salt, mật khẩu sinh ra dùng `crypto.getRandomValues`, không bao giờ `Math.random()`.

Admin đầu tiên (DB rỗng) tạo bằng `scripts/hash-password.mjs`: script in câu `INSERT … ON CONFLICT DO UPDATE`, chạy bằng `wrangler d1 execute --local` / `--remote`. Câu đó chứa email thật — **không commit**.

```bash
node scripts/hash-password.mjs <email> "<display_name>" [ADMIN|MEMBER]   # SQL ra stdout, mật khẩu sinh ra ra stderr
./node_modules/.bin/wrangler d1 execute subshare-db --local --command "<sql>"
```

Script import thẳng `src/server/domain/password.ts` và `code.ts` (Node ≥ 23.6 bỏ type TypeScript khi chạy), nên định dạng hash và mã không thể lệch với Worker. Vì vậy hai file đó **không được có import** runtime. `PASSWORD=...` để tự chọn mật khẩu thay vì sinh.

## Số vòng PBKDF2

Workers Free cho **10 ms CPU mỗi request**. OWASP khuyến nghị 600.000 vòng — không thể ở đây; bắt đầu ở **10.000**.

Số liệu tham khảo (đo trên Worker thật cùng account, cùng code băm): 10k vòng ≈ 5 ms `cpuTime`; 50k vòng 11–17 ms, vượt trần ở **mọi** lần đăng nhập.

**Không bao giờ chỉnh số vòng theo benchmark máy local.** Máy dev nhanh ~3 lần CPU Cloudflare: 50k chạy ~6 ms ở local trông an toàn, lên Worker thì vượt trần. Đổi xong phải đo trên bản deploy:

```bash
./node_modules/.bin/wrangler tail <worker-name> --format json   # trường cpuTime
```

**Cách lấy mẫu quyết định kết quả**: các lần thử cách nhau ~2 giây. Bắn dồn liên tiếp dựng isolate nguội và cho số cao giả tạo — không phải hình dạng traffic thật. Đừng hạ xuống 5k: 10k đã nằm gọn, giảm nửa work factor không được gì.

[Chưa xác minh] `change-password` chạy PBKDF2 **hai lần** (verify mật khẩu hiện tại + băm mật khẩu mới), nên ở 10k vòng nó tốn khoảng gấp đôi login (~10 ms theo số đo trên) — sát trần. Đo `cpuTime` của route này khi deploy lần đầu.

Thứ giữ an toàn là **mật khẩu dài và ngẫu nhiên**, không phải số vòng — mật khẩu admin tự đặt tay mới là điểm yếu.

### Bản ghi giả

Email không tồn tại thì login vẫn verify với một **bản ghi giả**, để sai email và sai mật khẩu tốn thời gian như nhau. **Số vòng của bản ghi giả nội suy từ `PBKDF2_ITERATIONS`**, không gán cứng: lệch một chỗ đó là login trượt tốn CPU gấp nhiều lần (vượt trần), và chênh lệch thời gian lộ email nào tồn tại — đúng thứ bản ghi giả sinh ra để che.

## Không có rate limit

Rate limit cho login cần KV hoặc Durable Objects — trái chủ trương chỉ Worker + D1. Bù bằng số tài khoản nhỏ, mật khẩu dài ngẫu nhiên.
