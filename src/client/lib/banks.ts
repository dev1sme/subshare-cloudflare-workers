// NAPAS BIN -> short bank name, for display only: the QR and the transfer use the BIN itself.
// An unknown BIN is shown as is, so a missing entry is cosmetic, never a wrong transfer.
const BANK_NAMES: Record<string, string> = {
  "970405": "Agribank",
  "970403": "Sacombank",
  "970407": "Techcombank",
  "970415": "VietinBank",
  "970416": "ACB",
  "970418": "BIDV",
  "970422": "MB Bank",
  "970423": "TPBank",
  "970426": "MSB",
  "970432": "VPBank",
  "970436": "Vietcombank",
  "970437": "HDBank",
  "970441": "VIB",
  "970443": "SHB",
  "970448": "OCB",
};

export function bankName(bin: string): string {
  return BANK_NAMES[bin] ?? bin;
}
