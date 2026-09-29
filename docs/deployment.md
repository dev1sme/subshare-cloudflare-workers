# Cấu hình & deploy

> Đã có `wrangler.jsonc` (scaffold). Chưa có database remote (`database_id` đang là placeholder toàn số 0), chưa có Cron Trigger, chưa đặt secret nào. Phần dưới là cấu hình đích và các bẫy đã biết.

## `wrangler.jsonc`

```jsonc
{
  "name": "subshare",
  "main": "./src/server/index.ts",
  "compatibility_date": "<ngày tạo project>",
  "assets": {
    // không khai báo "directory": vite-plugin tự trỏ vào output build của client
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "subshare-db", "database_id": "<uuid>", "migrations_dir": "./migrations" }
  ],
  "triggers": { "crons": ["<một biểu thức duy nhất>"] },
  "secrets": { "required": ["JWT_SECRET"] },
  "observability": { "enabled": true }
}
```

- `run_worker_first` quyết định route nào **tồn tại**: đường dẫn ngoài danh sách nhận `index.html`.
- Sửa file này xong chạy `npm run cf-typegen` (`wrangler types`) — không viết tay kiểu `Env`.
- Khi thêm custom domain qua `routes`, URL `*.workers.dev` bị tắt; muốn giữ làm dự phòng thì thêm `"workers_dev": true`. Wrangler tạo DNS record cho custom domain nhưng **không xoá** khi bỏ route — đổi domain thì dọn record cũ bằng tay.
- Bật Workers Logs (`observability`) trước khi có người dùng thật, để có dữ liệu khi cần debug.

## Secrets

**Repo public.** Mọi thứ commit ai cũng đọc được — `.dev.vars` bị gitignore, và không token, khoá, mật khẩu, email hay số tài khoản nào được nằm trong `.dev.vars.example`, tài liệu, migration hay comment.

| Secret | Dùng cho |
|---|---|
| `JWT_SECRET` | ký / kiểm JWT phiên (`openssl rand -base64 48`) |

Đặt bằng `wrangler secret put`, local nằm trong `.dev.vars`. Trước khi nói secret đã có trên Worker, kiểm bằng `wrangler secret list` — không suy ra từ `.dev.vars`.

### `secrets.required`

- Thiếu tên nào thì build in cảnh báo `Missing required secrets`. Coi đó là lời nhắc, chưa kiểm là `wrangler deploy` có chặn hay không.
- **Danh sách này quyết định secret nào vào `c.env` ở dev local.** Vite plugin chỉ copy từ `.dev.vars` những tên có trong danh sách; tên không có thì `undefined` lúc runtime, **không cảnh báo gì** — rất dễ debug nhầm hướng. Thêm mọi secret mới vào đây.
- Vite plugin copy `.dev.vars` vào output build để `vite preview` chạy được — output đó gitignore và không phục vụ cho trình duyệt, nhưng nghĩa là `dist/` chứa secret thật trên đĩa.

## Chạy local

```bash
npm install
npm run cf-typegen
npm run db:migrate          # D1 local
npm run dev
```

> `npx` không dùng được trong môi trường này (bị hook viết lại thành `npm`). Gọi qua npm script hoặc `./node_modules/.bin/<bin>`.

## Deploy

```bash
npm run db:migrate:remote
npm run deploy              # build + wrangler deploy — không bao giờ `wrangler pages deploy`
```

Sau migrate remote, **kiểm bằng bảng, không bằng thư mục**: `SELECT COUNT(*) FROM d1_migrations` phải bằng số file trong `migrations/`. Thư mục trông đủ trong khi remote chậm vài migration là kịch bản thật — mọi lệnh ghi trả 500 vì thiếu cột.

`wrangler d1 migrations apply --remote` có thể fail với `code 7403` ("account is not authorized") rồi thành công ngay khi thử lại mà không đổi gì. Thử lại một lần trước khi điều tra.

## Hạn mức miễn phí

**Account Cloudflare này dùng chung với các Worker khác.** Mọi hạn mức dưới đây tính **theo account**, không theo project.

| Tài nguyên | Free |
|---|---|
| Workers requests | 100.000/ngày (vượt → Error 1027) |
| CPU | **10 ms/request** (vượt → Error 1102) — giới hạn thực sự siết |
| Subrequest | 50/request, mỗi lệnh D1 tính một |
| Cron Triggers | **5 cho cả account** |
| D1 rows read / written | 5 triệu / 100.000 mỗi ngày |
| D1 storage | 5 GB tổng |

- **Từ 2026-09-01, D1 free tier chặn thật**: vượt rows read/written thì query fail tới nửa đêm UTC. Trước đó vượt vẫn chạy. Vì dùng chung account, một app khác quét bảng thừa cũng làm app này sập.
- Mọi query lọc hay join phải có index dùng được. Lọc theo khoảng (`period BETWEEN ? AND ?`) thay vì bọc cột trong hàm (`substr(period, 1, 4) = ?`) — bọc hàm là bỏ index, quét toàn bảng.
- Chờ D1 không tính vào CPU; gộp các câu độc lập vào một `db.batch()`.
- **Một** Cron Trigger cho mọi việc định kỳ, rẽ nhánh trong `scheduled()`. Trước khi thêm, đếm trigger đã có trên account.
- `scheduled()` đã có code (`src/server/index.ts` → `createDuePeriods` trong `src/server/scheduled.ts`): tạo kỳ tháng hiện tại (giờ Việt Nam) cho mọi gói đang dùng (thành viên luôn đóng theo tháng, kể cả gói `YEARLY`); idempotent nên chạy **hằng ngày** cũng an toàn và tự thử lại nếu lần trước lỗi. **Trigger chưa khai báo** trong `wrangler.jsonc` — cần đếm trigger trên account trước. Đề xuất `"crons": ["5 17 * * *"]` (00:05 giờ Việt Nam). Mỗi gói tốn 2 lệnh D1; trần 50 subrequest/lần chạy → tối đa ~24 gói trước khi phải chia lô.
- Thử `scheduled()` ở local: `npm run dev` rồi `curl "http://localhost:5173/cdn-cgi/handler/scheduled?cron=*+*+*+*+*"`.
- Cron chạy theo **UTC**; mọi tính toán kỳ dùng `Asia/Ho_Chi_Minh`. Việc cron làm phải idempotent (unique index + `ON CONFLICT DO NOTHING`) vì nó có thể chạy lại.
- `ctx.waitUntil()` có 30 giây sau khi response kết thúc. Promise nào cũng phải `await` hoặc đưa vào `waitUntil` — promise trôi nổi bị huỷ khi invocation kết thúc, mất việc mà không báo lỗi.
- Không dùng biến global mutable để giữ dữ liệu theo request: isolate được dùng lại giữa các request, dữ liệu rò sang người khác.

`npm audit` báo lỗ hổng trong `undici` qua `miniflare`/`wrangler` là toolchain dev local, không ship lên Worker; đừng "sửa" bằng cách hạ `@cloudflare/vite-plugin`.
