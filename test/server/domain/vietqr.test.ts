import { describe, expect, it } from "vitest";
import { buildVietQrPayload, crc16 } from "../../../src/server/domain/vietqr";

// Splits a TLV string into { id: value }.
function parse(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    fields[id] = payload.slice(i + 4, i + 4 + length);
    i += 4 + length;
  }
  return fields;
}

const INPUT = { bin: "970436", accountNo: "0123456789", amount: 37_000, note: "PM3C8EA506" };

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("buildVietQrPayload", () => {
  it("encodes the NAPAS fields", () => {
    const payload = buildVietQrPayload(INPUT);
    const fields = parse(payload);
    expect(fields["00"]).toBe("01");
    expect(fields["01"]).toBe("12");
    expect(fields["53"]).toBe("704");
    expect(fields["54"]).toBe("37000");
    expect(fields["58"]).toBe("VN");

    const merchant = parse(fields["38"]);
    expect(merchant).toEqual({ "00": "A000000727", "01": "000697043601100123456789", "02": "QRIBFTTA" });
    expect(parse(merchant["01"])).toEqual({ "00": "970436", "01": "0123456789" });
    expect(parse(fields["62"])).toEqual({ "08": "PM3C8EA506" });
  });

  it("ends with a CRC over everything before it, tag and length included", () => {
    const payload = buildVietQrPayload(INPUT);
    expect(payload.slice(-8, -4)).toBe("6304");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("is stable for the same input", () => {
    expect(buildVietQrPayload(INPUT)).toBe(
      "00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA5303704540537000" +
        "5802VN62140810PM3C8EA5066304" +
        crc16(
          "00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA5303704540537000" +
            "5802VN62140810PM3C8EA5066304",
        ),
    );
  });

  it("rejects input a bank would mangle", () => {
    expect(() => buildVietQrPayload({ ...INPUT, bin: "97043" })).toThrow(/BIN/);
    expect(() => buildVietQrPayload({ ...INPUT, accountNo: "12 34" })).toThrow(/account/);
    expect(() => buildVietQrPayload({ ...INPUT, amount: 0 })).toThrow(/amount/);
    expect(() => buildVietQrPayload({ ...INPUT, amount: 1.5 })).toThrow(/amount/);
    expect(() => buildVietQrPayload({ ...INPUT, note: "tiền tháng 10" })).toThrow(/note/);
  });
});
