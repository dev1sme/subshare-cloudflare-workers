# Thanh toán

Luồng **thủ công**, không ảnh biên lai:

1. Kỳ mới được tạo (cron hoặc admin) → mỗi thành viên một dòng `payments` `UNPAID` với phần tiền đã chốt.
2. Thành viên mở khoản của mình, quét VietQR, chuyển tiền, bấm **"Tôi đã chuyển"** → `PENDING`.
3. Admin đối chiếu sao kê ngân hàng → `PAID`. Không thấy tiền thì trả về `UNPAID`.

| Chuyển trạng thái | Ai |
|---|---|
| `UNPAID → PENDING` | thành viên, chỉ khoản của mình |
| `UNPAID/PENDING → PAID` | admin |
| `PENDING/PAID → UNPAID` | admin |

Mỗi chuyển trạng thái kiểm **trong chính câu `UPDATE … WHERE status IN (…)`**; không khớp → 409 `INVALID_STATUS_TRANSITION`. Hai admin bấm cùng lúc thì một người thắng, người kia nhận 409.

## Trả trước

Thành viên chọn **3 / 6 / 12 tháng** cho một gói mình có suất (`POST /api/me/prepayments`), không giảm giá. App tính khoảng tháng (tháng đầu tiên từ hiện tại chưa trả và chưa được phủ — [data-model.md](data-model.md#trả-trước)), trả VietQR với **tổng tiền** và **mã `PP…`** làm nội dung chuyển khoản. Trạng thái đi như payment: thành viên báo đã chuyển → admin đối chiếu sao kê → `PAID`.

- Admin xác nhận `PAID` → các payment đã có trong khoảng đó thành `PAID` (trỏ về lệnh); kỳ tạo sau trong khoảng đó sinh sẵn `PAID`.
- Admin trả về `UNPAID` → mọi payment lệnh đó đã trả cũng về `UNPAID`.
- Payment thuộc một lệnh trả trước **không** đổi trạng thái lẻ được (409 `PAYMENT_COVERED_BY_PREPAYMENT`) — đổi lệnh.
- Xoá: thành viên xoá lệnh của mình khi còn `UNPAID`; admin xoá khi `UNPAID`/`PENDING`; `PAID` phải trả về trước (`CANNOT_DELETE_PREPAYMENT`).

Thành viên **không bao giờ** tự đặt `PAID`. `PENDING` chỉ là lời báo, không phải bằng chứng — vì vậy bỏ ảnh biên lai không làm yếu đi thứ gì: ảnh cũng chỉ là lời báo, và đối chiếu sao kê mới là xác nhận thật.

## Tài khoản nhận tiền

Thông tin ngân hàng (`bank_bin` mã BIN NAPAS, `bank_account_no`, `bank_account_name`) nằm trên `plans`: tiền của gói chảy về **payer** của gói (`plans.payer_id`, luôn là admin — xem [data-model.md](data-model.md)), và một admin có thể nhận tiền mỗi gói vào một tài khoản khác nhau. Là **dữ liệu nhập qua UI**, không commit vào repo, config hay seed.

Gói chưa có thông tin ngân hàng, hoặc khoản đã `PAID` → response trả `bank_transfer: null`, UI chỉ hiện mã khoản dạng chữ.

## VietQR tự sinh

Payload QR **do app tự dựng** (`src/server/domain/vietqr.ts`, EMVCo TLV theo profile NAPAS) rồi vẽ SVG trên trình duyệt (`src/client/components/QrCode.tsx`): `uqr` chỉ mã hoá ra ma trận, React tự vẽ `<path>` — không `innerHTML`, không ảnh `data:` (CSP `img-src 'self'` cũng chặn nó). ECC `M`, quiet zone 4 module, luôn đen trên trắng.

**Không dùng `img.vietqr.io` hay bất kỳ dịch vụ ảnh QR nào.** Làm vậy là báo cho bên thứ ba ai nợ bao nhiêu, vào tài khoản nào; và dịch vụ đó sập thì trang thanh toán hỏng theo.

- Số tiền mã hoá là `payments.amount` của đúng khoản đó.
- Nội dung chuyển khoản là **`payments.code`** (vd `PM3C8EA506`) — để admin đối chiếu sao kê theo mã, không theo tên.
- CRC là CRC-16/CCITT-FALSE tính trên payload **kể cả** tag `6304` ở cuối. Sửa phần này thì kiểm với vector chuẩn: `"123456789"` → `29B1`.
- Đã có code (`buildVietQrPayload`): `00`=`01`, `01`=`12` (QR động, một số tiền), `38` = { `00` `A000000727`, `01` { `00` BIN, `01` số tài khoản }, `02` `QRIBFTTA` (chuyển tới số tài khoản) }, `53`=`704`, `54` số tiền, `58`=`VN`, `62` { `08` nội dung }, `6304` + CRC. Nội dung chỉ nhận chữ in hoa và số (mã `PM…`/`PP…`) — ngân hàng cắt hoặc làm hỏng ký tự khác.
- CRC đã đối chiếu với `binascii.crc_hqx(…, 0xFFFF)` của Python.
- QR vẽ trên màn thành viên đã được giải mã lại (2026-09-30, `BarcodeDetector` của Chrome trên chính SVG đó) và **khớp từng byte** với `bank_transfer.qr` của API. [Chưa xác minh] Chưa quét bằng app ngân hàng thật.

## Copy từng dòng

Số tài khoản, số tiền, nội dung — mỗi dòng một nút copy là control thật (người dùng trên điện thoại không tìm ra tooltip). **Số tiền copy ra số nguyên** (`120000`) trong khi hiển thị `120.000 đ`: dán chuỗi đã format vào app ngân hàng thì chuyển sai số hoặc bị từ chối. Tách `value` và `display` cho mọi dòng tiền.

## MoMo

Nếu có, chỉ hiện dạng chữ, **không bao giờ QR**: định dạng QR cá nhân của MoMo chưa được xác minh, đoán sai có thể gửi tiền vào ví người khác.

## Tự động đối chiếu (chưa làm)

Nếu sau này thêm webhook biến động số dư, những điều phải giữ: kiểm HMAC trên **raw body trước khi `JSON.parse`**; cửa sổ timestamp ~300 giây chống phát lại; so sánh thời gian hằng; secret chưa đặt → 503; idempotency bằng **unique index** trên id giao dịch, không SELECT-rồi-INSERT; lỗi mà retry không sửa được thì trả 200 để bên gửi ngừng retry; prefix route phải nằm trong `run_worker_first`, không thì webhook nhận `index.html` với 200 và mọi khoản bị mất im lặng.
