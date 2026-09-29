# Payments

Spec: `docs/payments.md`. Read it before touching VietQR, bank details, or payment status.

Must hold:

- The VietQR payload is built in-house (`src/server/domain/vietqr.ts`). Never route it through `img.vietqr.io` or any QR image service. Touching CRC: verify `"123456789"` → `29B1`.
- The QR encodes the amount still owed on that payment, and the transfer note carries the payment `code`.
- Money rows copy the raw integer while showing the formatted string — copying `120.000 đ` into a banking app transfers the wrong amount or is rejected.
- MoMo, if ever shown, is text only, never a QR.
- No receipt upload. A member can move their own payment `UNPAID → PENDING` only; only an admin sets `PAID` or reverts.
- Bank details are data, not code or config committed to the repo.
