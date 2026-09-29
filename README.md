# subshare-cloudflare-workers

> Quản lý các gói đăng ký dùng chung (YouTube Premium, Spotify, Netflix…): ai đang dùng gói nào, kỳ này ai đã đóng tiền, ai còn nợ.

Chạy hoàn toàn trên **Cloudflare**: một Worker phục vụ cả giao diện React lẫn API, dữ liệu trong D1.

<!-- Thêm ảnh chụp màn hình khi có -->
<!-- ![Giao diện](docs/screenshot.png) -->

---

## ✨ Tính năng

- **Tài khoản**: quản trị viên tạo tài khoản (đăng nhập bằng username, không email), đặt lại mật khẩu. Không có đăng ký tự do.
- **Quản lý gói**: mỗi gói có **người thanh toán** (một quản trị viên), **giá gói** (số người thanh toán trả nhà cung cấp, gồm phí) và **số tiền mỗi thành viên đóng mỗi tháng** — cả hai đặt tay, không chia tự động. Chu kỳ tháng/năm, số suất, tài khoản ngân hàng nhận tiền riêng cho từng gói.
- **Quản lý thành viên**: thêm người vào gói, cho rời gói (giữ lịch sử).
- **Kỳ thanh toán**: thành viên luôn đóng **theo tháng** (kể cả gói năm); kỳ mới tự tạo mỗi tháng, mỗi khoản có trạng thái *Chưa đóng / Chờ xác nhận / Đã đóng*.
- **Nộp tiền**: thành viên xem khoản cần đóng, quét **VietQR tự sinh** (không qua dịch vụ ngoài), bấm *Tôi đã chuyển*.
- **Trả trước**: thành viên trả gọn **3 / 6 / 12 tháng** một lần, không giảm giá; các tháng đó tự thành *Đã đóng*.
- **Xác nhận**: quản trị viên đối chiếu sao kê rồi xác nhận, hoặc trả về.
- **Dashboard ai còn nợ**, **nhắc nợ** *(dự kiến)*.

> **Trạng thái:** API và cơ sở dữ liệu đã xong và có test; **giao diện chưa làm**, **chưa deploy**. Chi tiết: [docs/roadmap.md](docs/roadmap.md).

## 🧱 Công nghệ

| Phần | Công nghệ |
|---|---|
| API | Cloudflare Workers, [Hono](https://hono.dev), TypeScript |
| Cơ sở dữ liệu | Cloudflare D1 (SQLite) |
| Giao diện | React + Vite + [shadcn/ui](https://ui.shadcn.com), phục vụ bởi chính Worker (static assets) |
| Việc định kỳ | Cron Trigger |
| Đăng nhập | JWT trong cookie `httpOnly`, mật khẩu PBKDF2 (Web Crypto) |
| Kiểm thử | Vitest + `@cloudflare/vitest-plugin` (chạy trong workerd, D1 thật) |

Chỉ Worker + D1 — không Pages, không R2, không dịch vụ ngoài. Lý do: [docs/architecture.md](docs/architecture.md).

## 📁 Cấu trúc thư mục

```
subshare-cloudflare-workers/
├── src/
│   ├── client/        # React SPA
│   ├── server/        # Hono API + cron trên Worker
│   └── shared/        # kiểu dùng chung
├── migrations/        # SQL migration cho D1
├── scripts/           # hash-password.mjs (tạo admin đầu tiên)
├── test/              # Vitest, soi gương src/
├── public/            # _headers
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
npm run test                     # chạy test
npm run dev                      # giao diện + API, một process
```

Tạo tài khoản quản trị đầu tiên (in ra câu SQL và mật khẩu — mật khẩu chỉ hiện một lần, **không commit** câu SQL):

```bash
node scripts/hash-password.mjs <username> "<tên hiển thị>"
./node_modules/.bin/wrangler d1 execute subshare-db --local --command "<câu SQL vừa in>"
```

## ☁️ Deploy lên Cloudflare

```bash
./node_modules/.bin/wrangler login

# Chỉ làm lần đầu: tạo D1 rồi chép database_id vào wrangler.jsonc
./node_modules/.bin/wrangler d1 create subshare-db
./node_modules/.bin/wrangler secret put JWT_SECRET

npm run db:migrate:remote
npm run deploy

# Admin đầu tiên trên production: như ở local, nhưng --remote
./node_modules/.bin/wrangler d1 execute subshare-db --remote --command "<câu SQL>"
```

Cron Trigger (tạo kỳ mỗi tháng) chưa khai báo trong `wrangler.jsonc` — tài khoản Cloudflare chỉ có 5 trigger dùng chung cho mọi Worker, cần đếm trước. Xem [docs/deployment.md](docs/deployment.md).

Chi tiết và các bẫy đã biết: [docs/deployment.md](docs/deployment.md).

## 🗄️ Cơ sở dữ liệu (tóm tắt)

| Bảng | Nội dung |
|---|---|
| `users` | Người dùng (username, tên hiển thị, vai trò) |
| `plans` | Gói đăng ký (tên, giá gói, số tiền mỗi thành viên, chu kỳ, số suất, người thanh toán, tài khoản nhận tiền) |
| `plan_members` | Ai thuộc gói nào, vào / rời khi nào |
| `billing_periods` | Các kỳ thanh toán, giá chốt tại thời điểm tạo |
| `payments` | Khoản của từng người mỗi kỳ (số tiền chốt lúc tạo kỳ), trạng thái |
| `prepayments` | Các lần trả trước 3 / 6 / 12 tháng |

Chi tiết: [docs/data-model.md](docs/data-model.md).

## 🔌 API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/accounts` | Tạo tài khoản *(admin)* |
| `POST` | `/api/plans` | Tạo gói *(admin)* |
| `POST` | `/api/plans/:code/members` | Thêm thành viên *(admin)* |
| `POST` | `/api/plans/:code/periods` | Tạo kỳ thanh toán *(admin; cron cũng dùng)* |
| `GET` | `/api/me/payments/:code` | Khoản cần đóng + VietQR |
| `POST` | `/api/me/payments/:code/mark-sent` | Báo đã chuyển tiền |
| `POST` | `/api/me/prepayments` | Trả trước 3 / 6 / 12 tháng |
| `GET` | `/api/payments?status=PENDING` | Các khoản chờ xác nhận *(admin)* |
| `PATCH` | `/api/payments/:code` | Xác nhận đã đóng / trả về *(admin)* |

Đầy đủ: [docs/api.md](docs/api.md).

## 🗺️ Kế hoạch

[docs/roadmap.md](docs/roadmap.md)

## ⚠️ Lưu ý

Một số dịch vụ (ví dụ YouTube Premium Family) chỉ cho phép chia sẻ trong **cùng hộ gia đình**. Hãy dùng đúng điều khoản của từng dịch vụ.

## 📄 Giấy phép

[MIT](LICENSE)
