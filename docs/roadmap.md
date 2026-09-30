# Lộ trình

Nguồn duy nhất cho việc còn phải làm. Làm xong thì đánh dấu, và cập nhật `.claude/rules/project-state.md` kèm cách đã kiểm.

## Nền

- [x] Scaffold: Vite + React + Hono + `@cloudflare/vite-plugin`, `wrangler.jsonc`, npm scripts theo `.claude/rules/commands.md`
- [x] `envelope.ts`, `validate.ts`, `headers.ts`, `public/_headers`
- [ ] Tạo D1 `subshare-db` (qua MCP `d1_database_create`), dán `database_id`
- [x] Migration 0001 theo [data-model.md](data-model.md)
- [x] Auth: PBKDF2 + JWT cookie, `requireAdmin` / `requireMember`, `scripts/hash-password.mjs`
- [ ] Deploy lần đầu; đo `cpuTime` login trên Worker thật

## Tính năng

- [x] Quản lý tài khoản (`/api/accounts`): tạo, đổi tên / vai trò, đặt lại mật khẩu, xoá; `requireAdmin` đọc vai trò từ DB

- [x] Quản lý gói: giá (VND, gồm phí, đặt tay), chu kỳ `MONTHLY`/`YEARLY`, số suất cho thành viên, payer (admin), thông tin ngân hàng
- [x] Quản lý thành viên: thêm vào gói, rời gói; số tiền là `plans.member_amount`, chung cho cả gói; payer không được là thành viên của gói mình
- [x] Tạo kỳ: tay (admin) và hàm `scheduled()` idempotent
- [ ] Khai báo Cron Trigger (đếm trigger trên account trước) — cần deploy
- [x] API thành viên: khoản cần đóng, VietQR, "Tôi đã chuyển", trả trước 3/6/12 tháng
- [x] Nền UI: token + font tự host, primitive shadcn, i18next, `api.ts`, phiên, router theo vai trò, layout, `useConfirm`, toast, error boundary lỗi chunk
- [x] Màn thành viên: đăng nhập, khoản cần đóng, chi tiết + VietQR + copy từng dòng, "Tôi đã chuyển"
- [ ] Màn thành viên: trả trước 3/6/12 tháng, đổi mật khẩu
- [ ] Quét VietQR bằng app ngân hàng thật
- [x] API admin: danh sách `PENDING`, xác nhận / trả về (payment và trả trước)
- [x] Xin vào gói: `plans.accepting_requests`, `join_requests` (migration 0006), API member + admin, màn "Khám phá" và màn "Yêu cầu"
- [x] Đổi giao diện sang Material 3 Expressive + animation (`motion`)
- [x] Đổi giao diện sang "lấy dịch vụ làm trung tâm": `plans.provider` (migration 0007), logo hãng (`simple-icons`), trang chủ "Gói của tôi", gộp theo nhà cung cấp; bảng màu teal (`scripts/generate-palette.mjs`), logo chữ S + mũi tên, favicon
- [ ] Màn admin (UI):
  - [x] Duyệt thanh toán: chờ xác nhận (payment + trả trước) / chưa đóng / đã đóng theo kỳ
  - [x] CRUD gói, thành viên (thêm / rời), kỳ (xem, tạo tháng này)
  - [ ] Tài khoản
  - [ ] Hoàn tác một lần trả trước đã `PAID` (API có, UI chưa)
- [ ] Dashboard admin: ai còn nợ, qua mọi kỳ

## Sau này

- [ ] Nhắc nợ. Kênh chưa chốt; nếu là bot chat: token mã hoá at-rest (AES-GCM, khoá là secret), không response nào trả token, gửi qua `ctx.waitUntil` + `Promise.allSettled` để lỗi gửi không làm hỏng thao tác gốc, và **chat nhóm không bao giờ nhận số tiền hay tên người nợ**.
- [ ] Thống kê chi tiêu theo tháng / năm (lọc kỳ theo khoảng để dùng index)

## Đã loại

- Chia tiền tự động (đều / theo trọng số, `domain/split.ts`) — giá gói trả bằng USD kèm phí và chia hay ra số lẻ; admin đặt giá và số tiền từng người bằng tay.

- Ảnh biên lai / R2 — xác nhận bằng đối chiếu sao kê là đủ.
- Cloudflare Pages, monorepo deploy tách — một Worker phục vụ cả SPA và API.
- Đăng ký tự do, xác minh email, quên mật khẩu qua email — cần dịch vụ gửi mail.
- Rate limit login — cần KV/Durable Objects.
