# subshare-cloudflare-workers

> Quản lý các gói đăng ký dùng chung (YouTube Premium, Spotify, Netflix…): ai đang dùng gói nào, kỳ này ai đã đóng tiền, ai còn nợ.

Chạy hoàn toàn trên **Cloudflare**: một Worker phục vụ cả giao diện React lẫn API, dữ liệu trong D1.

<!-- Thêm ảnh chụp màn hình khi có -->
<!-- ![Giao diện](docs/screenshot.png) -->

---

## ✨ Tính năng

- **Quản lý gói**: tạo gói, giá tiền, chu kỳ (tháng/năm), số suất tối đa.
- **Quản lý thành viên**: thêm người vào gói, chia tiền đều hoặc theo tỉ lệ.
- **Kỳ thanh toán**: tự tạo kỳ mới mỗi tháng, mỗi thành viên có trạng thái *Chưa đóng / Chờ xác nhận / Đã đóng*.
- **Nộp tiền**: thành viên xem số tiền cần đóng, quét mã VietQR, bấm *Tôi đã chuyển*.
- **Xác nhận**: quản trị viên đối chiếu sao kê rồi xác nhận.
- **Nhắc nợ** *(dự kiến)*.

## 🧱 Công nghệ

| Phần | Công nghệ |
|---|---|
| API | Cloudflare Workers, [Hono](https://hono.dev), TypeScript |
| Cơ sở dữ liệu | Cloudflare D1 (SQLite) |
| Giao diện | React + Vite + [shadcn/ui](https://ui.shadcn.com), phục vụ bởi chính Worker (static assets) |
| Việc định kỳ | Cron Trigger |
| Đăng nhập | JWT trong cookie `httpOnly` |

Chỉ Worker + D1 — không Pages, không R2, không dịch vụ ngoài. Lý do: [docs/architecture.md](docs/architecture.md).

## 📁 Cấu trúc thư mục

```
subshare-cloudflare-workers/
├── src/
│   ├── client/        # React SPA
│   ├── server/        # Hono API + cron trên Worker
│   └── shared/        # kiểu dùng chung
├── migrations/        # SQL migration cho D1
├── public/            # _headers, favicon
├── docs/              # đặc tả hệ thống
├── wrangler.jsonc
└── README.md
```

## 🚀 Chạy ở máy (local)

**Yêu cầu:** Node.js LTS, npm.

```bash
git clone https://github.com/dev1sme/subshare-cloudflare-workers.git
cd subshare-cloudflare-workers
npm install
cp .dev.vars.example .dev.vars   # rồi điền giá trị (không commit file này)

npm run cf-typegen
npm run db:migrate               # D1 local
npm run dev                      # giao diện + API, một process
```

## ☁️ Deploy lên Cloudflare

```bash
./node_modules/.bin/wrangler login

# Chỉ làm lần đầu: tạo D1 rồi chép database_id vào wrangler.jsonc
./node_modules/.bin/wrangler d1 create subshare-db
./node_modules/.bin/wrangler secret put JWT_SECRET

npm run db:migrate:remote
npm run deploy
```

Chi tiết và các bẫy đã biết: [docs/deployment.md](docs/deployment.md).

## 🗄️ Cơ sở dữ liệu (tóm tắt)

| Bảng | Nội dung |
|---|---|
| `users` | Người dùng (username, tên hiển thị, vai trò) |
| `plans` | Gói đăng ký (tên, giá, chu kỳ, số suất, tài khoản nhận tiền) |
| `plan_members` | Ai thuộc gói nào, trọng số chia tiền |
| `billing_periods` | Các kỳ thanh toán, giá chốt tại thời điểm tạo |
| `payments` | Khoản của từng người mỗi kỳ, trạng thái |

Chi tiết: [docs/data-model.md](docs/data-model.md).

## 🔌 API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập |
| `GET` | `/api/plans` | Danh sách gói *(admin)* |
| `POST` | `/api/plans` | Tạo gói *(admin)* |
| `POST` | `/api/plans/:code/members` | Thêm thành viên *(admin)* |
| `GET` | `/api/me/payments` | Các khoản tôi cần đóng |
| `POST` | `/api/me/payments/:code/mark-sent` | Báo đã chuyển tiền |
| `PATCH` | `/api/payments/:code` | Xác nhận đã đóng *(admin)* |

Đầy đủ: [docs/api.md](docs/api.md).

## 🗺️ Kế hoạch

[docs/roadmap.md](docs/roadmap.md)

## ⚠️ Lưu ý

Một số dịch vụ (ví dụ YouTube Premium Family) chỉ cho phép chia sẻ trong **cùng hộ gia đình**. Hãy dùng đúng điều khoản của từng dịch vụ.

## 📄 Giấy phép

[MIT](LICENSE)
