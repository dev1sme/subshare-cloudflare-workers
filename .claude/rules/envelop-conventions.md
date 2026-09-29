## 1. Response Format Rules

### Purpose

Chuẩn hóa JSON response để frontend, mobile, QA và integration partner tích hợp ổn định.

### 1.1 Envelope chuẩn

#### Success response

```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {
    "id": 123,
    "status": "pending",
    "total_amount": 250000,
    "created_at": "2026-06-08 10:20:30+01:00"
  },
  "meta": {
    "timestamp": 1149318030
  }
}
```

#### Error response

```json
{
  "success": false,
  "message": "Order cannot be cancelled.",
  "error": {
    "code": "ORDER_CANNOT_BE_CANCELLED",
    "details": null
  },
  "meta": {
    "timestamp": 1149318030
  }
}
```

#### Validation error response

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "customer_id": ["The customer id field is required."],
      "items.0.quantity": ["The items.0.quantity must be at least 1."]
    }
  },
  "meta": {
    "timestamp": 1149318030
  }
}
```

### 1.2 Quy tắc chung cho response

- Mọi response phải có `success`
- Response thành công nên có `message`, `data`, `meta`
- Response lỗi nên có `message`, `error`, `meta`
- `meta.timestamp` phải trả kiểu số
- Không đổi tên tùy tiện giữa `data`, `result`, `payload`
- Không trả raw model hoặc raw exception cho client

### 1.2.1 Định dạng `error.code`

- `error.code` **bắt buộc UPPER_SNAKE**, tiếng Anh: `DUPLICATE_DATA`, `PLAN_NOT_FOUND`, `INVALID_PERIOD`
- Khớp regex `^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$` — không chữ thường, không gạch nối, không khoảng trắng
- Code do validation sinh ra ghép từ tên field: `MISSING_<FIELD>`, `INVALID_<FIELD>`, `TOO_LONG_<FIELD>` (ví dụ `MISSING_PLAN_NAME`)
- Code là **API contract**. Đổi chữ của code là breaking change, không phải sửa câu chữ

Điều này phải được **enforce trong code**, không chỉ nằm ở tài liệu:

- `failure()` trong `src/server/envelope.ts` throw nếu code không khớp regex — không có đường nào trả về một code sai định dạng
- `fail()` trong `src/server/validate.ts` throw tương tự, chặn tại chỗ ném lỗi
- `validationDetails()` tách field từ code UPPER_SNAKE rồi hạ về chữ thường làm khóa trong `error.details`

Kiểm nhanh toàn bộ code đang dùng:

```bash
grep -rhoE '(failure\(c, "|fail\(")[a-zA-Z_]+"' src/server/ \
  | sed -E 's/.*"([a-zA-Z_]+)"/\1/' | sort -u | grep -vE '^[A-Z][A-Z0-9_]*$'
```

Format đúng chưa đủ — code còn phải **đọc được bằng tiếng Việt**. `errorMessage` ở client tra `errors.<CODE>` trước, không có thì rơi xuống lối thoát sinh câu từ tên field (`INVALID_PRICE` → "Giá trị không hợp lệ: giá gói"). Lối thoát đó chỉ đẹp khi code **đặt tên đúng một field người dùng nhìn thấy**, và `fields.<field>` có mặt. Một code kiểu `INVALID_BODY` sẽ in ra "Giá trị không hợp lệ: body." — sai cả hai điều kiện.

Tìm code thiếu message:

```bash
grep -rhoE '"[A-Z][A-Z0-9]*(_[A-Z0-9]+)+"' src/server/ | tr -d '"' | sort -u \
  | while read -r c; do grep -q "^    ${c}:" src/client/i18n/locales/vi.ts || echo "$c"; done
```

Danh sách trả về không phải lỗi hết. Bỏ qua:

- **Enum value**, không phải error code: `UNPAID`, `PENDING`, `PAID`, `ADMIN`, `MEMBER`.
- **`reason` nội bộ** bị bọc lại trước khi ra tới client — chính code bọc ngoài mới là cái client tra.
- **Khớp `MISSING_`/`INVALID_`/`TOO_LONG_` và có `fields.<field>`**: sinh câu tự động là đúng ý, không cần key riêng.

Còn lại mới là thiếu thật.

### 1.3 Format của thuộc tính

- Integer phải trả kiểu số thật, không được bọc trong dấu `""` hoặc `''`
- `timestamp` trong `meta` phải trả kiểu số, không được trả chuỗi
- Boolean trả kiểu boolean thật, không dùng chuỗi `"true"` hoặc `"false"`
- Numeric field phải ổn định kiểu dữ liệu giữa các endpoint
- Enum field trả giá trị ổn định, machine-readable, **UPPER_SNAKE tiếng Anh** — trong dự án này: `UNPAID` / `PENDING` / `PAID`, `MONTHLY` / `YEARLY`, `ADMIN` / `MEMBER`. Giá trị enum được CHECK-constraint trong D1, nên đổi chúng cần migration
- Nullable field phải rõ ràng là `null` hoặc không có mặt theo một quy ước thống nhất

### 1.4 Exposure rules

- Không expose secret, token, password hash, internal key
- Không expose field nội bộ không nằm trong public contract
- Không trả stack trace hoặc exception message nội bộ trên production
