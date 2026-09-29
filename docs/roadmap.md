# Lộ trình

Nguồn duy nhất cho việc còn phải làm. Làm xong thì đánh dấu, và cập nhật `.claude/rules/project-state.md` kèm cách đã kiểm.

## Nền

- [x] Scaffold: Vite + React + Hono + `@cloudflare/vite-plugin`, `wrangler.jsonc`, npm scripts theo `.claude/rules/commands.md`
- [x] `envelope.ts`, `validate.ts`, `headers.ts`, `public/_headers`
- [ ] Tạo D1 `subshare-db` (qua MCP `d1_database_create`), dán `database_id`
- [ ] Migration 0001 theo [data-model.md](data-model.md)
- [ ] Auth: PBKDF2 + JWT cookie, `requireAdmin` / `requireMember`, `scripts/hash-password.mjs`
- [ ] Deploy lần đầu; đo `cpuTime` login trên Worker thật

## Tính năng

- [ ] Quản lý gói: giá, chu kỳ `MONTHLY`/`YEARLY`, số suất tối đa, thông tin ngân hàng
- [ ] Quản lý thành viên: thêm vào gói, chia đều hoặc theo trọng số, rời gói
- [ ] `domain/split.ts` + test: tổng các phần luôn bằng giá
- [ ] Tạo kỳ: tay (admin) và Cron Trigger đầu tháng giờ Việt Nam, idempotent
- [ ] Màn thành viên: khoản cần đóng, VietQR, nút "Tôi đã chuyển"
- [ ] Màn admin: danh sách `PENDING` chờ xác nhận, xác nhận / trả về
- [ ] Dashboard admin: ai còn nợ, qua mọi kỳ

## Sau này

- [ ] Nhắc nợ. Kênh chưa chốt; nếu là bot chat: token mã hoá at-rest (AES-GCM, khoá là secret), không response nào trả token, gửi qua `ctx.waitUntil` + `Promise.allSettled` để lỗi gửi không làm hỏng thao tác gốc, và **chat nhóm không bao giờ nhận số tiền hay tên người nợ**.
- [ ] Thống kê chi tiêu theo tháng / năm (lọc kỳ theo khoảng để dùng index)

## Đã loại

- Ảnh biên lai / R2 — xác nhận bằng đối chiếu sao kê là đủ.
- Cloudflare Pages, monorepo deploy tách — một Worker phục vụ cả SPA và API.
- Đăng ký tự do, xác minh email, quên mật khẩu qua email — cần dịch vụ gửi mail.
- Rate limit login — cần KV/Durable Objects.
