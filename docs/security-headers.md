# Security headers

Đặt ở **hai nơi, và cần cả hai**. Với `run_worker_first: ["/api/*"]`, Cloudflare phục vụ mọi đường dẫn khác thẳng từ kho asset mà không gọi Worker, nên middleware Hono không bao giờ chạm tới trang HTML.

| Nơi | Phủ | Nội dung |
|---|---|---|
| `public/_headers` | SPA (HTML, JS, CSS) | CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| `securityHeaders` trong `src/server/headers.ts` | `/api/*` | `Cache-Control: no-store`, `nosniff`, `Referrer-Policy`, CSP `default-src 'none'` |

`Cache-Control: no-store` trên API vì ai nợ bao nhiêu không được nằm trong cache nào.

Vite copy `_headers` vào output client; Cloudflare đọc nó như cấu hình, không phục vụ nó. Log khởi động in `Parsed N valid header rule` — xem số đó sau mỗi lần sửa.

## Middleware đặt header trước `await next()`

Hono giữ chúng làm prepared header và gộp vào mọi response context dựng ra, kể cả 400 của `onError` và 404 của `notFound`. Đặt sau `next()` là âm thầm mất header trên mọi response lỗi, vì lỗi bị ném ra thì không quay lại middleware.

## CSP

Hiện tại (`public/_headers`): `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. API: `default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`.

- `script-src 'self'`, **không** `'unsafe-inline'`. Script inline duy nhất được phép (vd script chọn theme trước lần vẽ đầu) đi bằng **sha256 của đúng chuỗi byte đó**; sửa script mà không sinh lại hash thì nó bị chặn im lặng. Ghi lệnh sinh hash vào comment đầu `_headers`.
- `style-src`: kiểm trên `vite preview` ngày 2026-09-30 (Chrome headless qua CDP) — **2 vi phạm mỗi lần tải trang**, đều từ Sonner: nó luôn chèn `<style>` lúc runtime (một thẻ rỗng, hash `sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=`, và một thẻ chứa CSS của nó). Hiện tại chúng bị chặn và **vô hại**: cùng CSS đó được import tĩnh vào bundle (`@import "sonner/dist/styles.css"` trong `index.css`). Radix Dialog (qua `react-remove-scroll`) cũng chèn `<style>` khóa cuộn khi dialog mở, với nội dung động (độ rộng thanh cuộn) nên không pin được bằng hash; nonce không dùng được vì asset tĩnh không đi qua Worker. Đã kiểm 2026-09-30 trên Chrome thật: khi AlertDialog mở, `body` vẫn `overflow: visible` và trang nền **vẫn cuộn được** — khoá cuộn mất tác dụng; dialog, focus và nút vẫn đúng. **Chưa quyết** có thêm `'unsafe-inline'` cho riêng `style-src` hay không.
- Font tự host (`@fontsource`), không CDN — `font-src 'self'`.
- QR vẽ thành SVG trên client từ payload tự sinh; không `img-src` tới dịch vụ QR nào.
- Chunk import động là script cùng origin, đã nằm trong `'self'`.

## HSTS

`max-age=31536000; includeSubDomains`, cố ý **không** `preload`. Trình duyệt đã tải site một lần sẽ từ chối HTTP tới đúng hostname đó trong một năm, nên rút ngắn hay bỏ header không có hiệu lực ngay. Pin theo từng host.

## Kiểm tra

`_headers` chỉ áp dụng cho build thật — `npm run dev` không phục vụ nó.

```bash
npm run build && ./node_modules/.bin/vite preview
```

Kiểm cả một response asset lẫn một response API.
