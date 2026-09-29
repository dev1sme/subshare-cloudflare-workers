# subshare-cloudflare-workers

> Quản lý các gói đăng ký dùng chung (YouTube Premium, Spotify, Netflix…): ai đang dùng gói nào, kỳ này ai đã đóng tiền, ai còn nợ.

Chạy hoàn toàn trên **Cloudflare**: Workers (API) · D1 (cơ sở dữ liệu) · Pages (giao diện React).

<!-- Thêm ảnh chụp màn hình khi có -->
<!-- ![Giao diện](docs/screenshot.png) -->

---

## ✨ Tính năng

- **Quản lý gói**: tạo gói, giá tiền, chu kỳ (tháng/năm), số suất tối đa.
- **Quản lý thành viên**: mời người vào gói, chia tiền đều hoặc theo tỉ lệ.
- **Kỳ thanh toán**: tự tạo kỳ mới mỗi tháng, mỗi thành viên có trạng thái *Chưa đóng / Chờ xác nhận / Đã đóng*.
- **Nộp tiền**: thành viên xem số tiền cần đóng, mã QR chuyển khoản và tải ảnh biên lai lên.
- **Xác nhận**: quản trị viên duyệt các khoản đã đóng.
- **Nhắc nợ** *(dự kiến)*: gửi thông báo cho người chưa đóng.

## 🧱 Công nghệ

| Phần | Công nghệ |
|---|---|
| API | Cloudflare Workers, [Hono](https://hono.dev), TypeScript |
| Cơ sở dữ liệu | Cloudflare D1 (SQLite) + [Drizzle ORM](https://orm.drizzle.team) |
| Lưu ảnh biên lai | Cloudflare R2 |
| Giao diện | React + Vite + [shadcn/ui](https://ui.shadcn.com), deploy lên Cloudflare Pages |
| Đăng nhập | JWT |

## 📁 Cấu trúc thư mục

```
subshare-cloudflare-workers/
├── apps/
│   ├── api/            # Cloudflare Workers (Hono)
│   │   ├── src/
│   │   ├── migrations/ # SQL migration cho D1
│   │   └── wrangler.jsonc
│   └── web/            # React (Cloudflare Pages)
├── docs/
└── README.md
```

## 🚀 Chạy ở máy (local)

**Yêu cầu:** Node.js 20 trở lên, npm (hoặc pnpm).

```bash
# 1. Tải code về
git clone https://github.com/<tai-khoan>/subshare-cloudflare-workers.git
cd subshare-cloudflare-workers
npm install

# 2. Tạo cơ sở dữ liệu local
cd apps/api
npx wrangler d1 migrations apply subshare-db --local

# 3. Chạy API  →  http://localhost:8787
npx wrangler dev

# 4. Chạy giao diện (ở terminal khác)  →  http://localhost:5173
cd ../web
npm run dev
```

### Biến môi trường

Tạo file `apps/api/.dev.vars` (**không commit file này**):

```
JWT_SECRET=chuoi-bi-mat-bat-ky
ADMIN_EMAIL=admin@example.com
```

## ☁️ Deploy lên Cloudflare

```bash
# Đăng nhập Cloudflare
npx wrangler login

# Tạo D1 và R2 (chỉ làm lần đầu), rồi chép ID vào wrangler.jsonc
npx wrangler d1 create subshare-db
npx wrangler r2 bucket create subshare-receipts

# Chạy migration trên môi trường thật
npx wrangler d1 migrations apply subshare-db --remote

# Đặt biến bí mật
npx wrangler secret put JWT_SECRET

# Deploy API
cd apps/api && npx wrangler deploy

# Deploy giao diện
cd ../web && npm run build && npx wrangler pages deploy dist
```

## 🗄️ Cơ sở dữ liệu (tóm tắt)

| Bảng | Nội dung |
|---|---|
| `users` | Người dùng (tên, email, vai trò) |
| `plans` | Gói đăng ký (tên, giá, chu kỳ, số suất) |
| `plan_members` | Ai thuộc gói nào, phần tiền phải đóng |
| `billing_periods` | Các kỳ thanh toán (tháng 10/2026…) |
| `payments` | Khoản đóng của từng người mỗi kỳ, trạng thái, ảnh biên lai |

## 🔌 API chính

| Method | Đường dẫn | Mô tả |
|---|---|---|
| `POST` | `/auth/login` | Đăng nhập |
| `GET` | `/plans` | Danh sách gói |
| `POST` | `/plans` | Tạo gói *(admin)* |
| `POST` | `/plans/:id/members` | Thêm thành viên *(admin)* |
| `GET` | `/me/payments` | Các khoản tôi cần đóng |
| `POST` | `/payments/:id/receipt` | Tải biên lai lên |
| `PATCH` | `/payments/:id` | Xác nhận đã đóng *(admin)* |

## 🗺️ Kế hoạch

- [x] Quản lý gói và thành viên
- [x] Theo dõi đóng tiền theo kỳ
- [ ] Mã QR VietQR tự điền số tiền
- [ ] Nhắc nợ qua email / Telegram
- [ ] Thống kê chi tiêu theo tháng

## ⚠️ Lưu ý

Một số dịch vụ (ví dụ YouTube Premium Family) chỉ cho phép chia sẻ trong **cùng hộ gia đình**. Hãy dùng đúng điều khoản của từng dịch vụ.

## 📄 Giấy phép

[MIT](LICENSE)
