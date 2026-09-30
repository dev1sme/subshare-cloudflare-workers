// Renders the PWA icons in public/ from public/favicon.svg. Spec: docs/design-system.md#logo.
//
//   node scripts/generate-icons.mjs
//
// Rerun after editing favicon.svg (e.g. a palette change) and commit the PNGs. `sharp` is not a
// direct dependency: it comes with miniflare (through @cloudflare/vite-plugin). If it ever goes
// away, install it with --no-save for one run — the PNGs are committed, nothing needs it at build.
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");

// "any" keeps the rounded tile with transparent corners. Maskable and Apple icons must be
// full-bleed: the platform applies its own mask, and iOS paints transparency black. The S already
// sits inside the maskable safe zone (a circle of 80% of the size), so only the corners change.
const square = source.replace(/ rx="[^"]*"/, "");
if (square === source) throw new Error("favicon.svg: no rx on the tile, update this script");

const outputs = [
  ["icon-192.png", source, 192],
  ["icon-512.png", source, 512],
  ["icon-maskable-512.png", square, 512],
  ["apple-touch-icon.png", square, 180],
];

for (const [name, svg, size] of outputs) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname);
  console.log(`public/${name} ${size}x${size}`);
}
