// VietQR payload, built in-house (EMVCo merchant-presented QR, NAPAS profile). Spec: docs/payments.md.
// Never route this through img.vietqr.io or any QR image service: that tells a third party who owes
// how much to which account. The browser draws the QR from this string.

import type { BankTransfer, PaymentStatus } from "../../shared/types";

// Every field is ID (2 digits) + length (2 digits) + value.
function tlv(id: string, value: string): string {
  if (value.length > 99) throw new Error(`VietQR field ${id} is longer than 99 characters`);
  return id + String(value.length).padStart(2, "0") + value;
}

// CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no final xor. Check value:
// "123456789" -> 29B1.
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const NAPAS_GUID = "A000000727";
// Transfer to an account number (QRIBFTTC would be to a card).
const SERVICE_TO_ACCOUNT = "QRIBFTTA";
const CURRENCY_VND = "704";

const BIN = /^\d{6}$/;
const ACCOUNT_NO = /^\d{4,19}$/;
// Payment / prepayment codes only: banks drop or mangle anything but ASCII letters and digits.
const NOTE = /^[A-Z0-9]{1,25}$/;

export type VietQrInput = {
  bin: string;
  accountNo: string;
  // Whole VND.
  amount: number;
  // The payment or prepayment code, e.g. PM3C8EA506 — matched against the bank statement.
  note: string;
};

export function buildVietQrPayload({ bin, accountNo, amount, note }: VietQrInput): string {
  if (!BIN.test(bin)) throw new Error("VietQR: BIN must be 6 digits");
  if (!ACCOUNT_NO.test(accountNo)) throw new Error("VietQR: account number must be 4-19 digits");
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("VietQR: amount must be a positive integer");
  if (!NOTE.test(note)) throw new Error("VietQR: note must be 1-25 uppercase letters or digits");

  const payload =
    tlv("00", "01") + // payload format indicator
    tlv("01", "12") + // point of initiation: dynamic (one amount, one payment)
    tlv("38", tlv("00", NAPAS_GUID) + tlv("01", tlv("00", bin) + tlv("01", accountNo)) + tlv("02", SERVICE_TO_ACCOUNT)) +
    tlv("53", CURRENCY_VND) +
    tlv("54", String(amount)) +
    tlv("58", "VN") +
    tlv("62", tlv("08", note)) + // additional data: purpose of transaction = transfer note
    "6304"; // CRC tag and length are part of the checksummed input
  return payload + crc16(payload);
}

type BankDetails = { bank_bin: string | null; bank_account_no: string | null; bank_account_name: string | null };

// What a member is shown to pay `amount` for `note`. Null once PAID (nothing is owed) or while the
// plan has no bank details — the UI then shows the code as text only.
export function bankTransferFor(bank: BankDetails, amount: number, note: string, status: PaymentStatus): BankTransfer | null {
  if (status === "PAID" || !bank.bank_bin || !bank.bank_account_no) return null;
  return {
    bank_bin: bank.bank_bin,
    account_no: bank.bank_account_no,
    account_name: bank.bank_account_name,
    amount,
    note,
    qr: buildVietQrPayload({ bin: bank.bank_bin, accountNo: bank.bank_account_no, amount, note }),
  };
}
