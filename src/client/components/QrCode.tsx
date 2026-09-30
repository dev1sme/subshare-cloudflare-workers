import { m } from "motion/react";
import { useMemo } from "react";
import { encode } from "uqr";
import { spring } from "../lib/motion";

// Draws the VietQR payload built by the server as an SVG, entirely in the browser — the payload
// never goes to a QR image service (docs/payments.md). ECC M is what banking QR codes commonly
// use; a 4-module quiet zone keeps phone scanners reliable.
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 4 });
    let d = "";
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { path: d, size: qr.size };
  }, [value]);

  return (
    <m.svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, transition: spring }}
    >
      {/* Always black on white, whatever the theme: scanners expect dark modules on light. */}
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </m.svg>
  );
}
