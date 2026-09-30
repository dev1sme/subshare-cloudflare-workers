// Prints the colour tokens for the @theme block in src/client/index.css. Spec: docs/design-system.md#màu.
//
//   ./node_modules/.bin/esbuild scripts/generate-palette.mjs --bundle --platform=node --format=esm \
//     --log-level=warning | node --input-type=module
//
// The Material package uses extension-less ESM imports, so Node cannot run it directly; esbuild
// (installed with Vite) bundles it first. Paste the output over the colour lines of @theme —
// never hand-edit one colour: change SEED or SCHEME here and regenerate the whole block.
import {
  Hct,
  MaterialDynamicColors as C,
  SchemeTonalSpot,
  TonalPalette,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";

// Teal, tonal spot (chosen 2026-09-30): a calm teal for brand and actions, surfaces lightly tinted.
const SEED = "#00796B";
const SCHEME = SchemeTonalSpot;

const scheme = new SCHEME(Hct.fromInt(argbFromHex(SEED)), false, 0);

const ROLES = [
  "surface",
  "onSurface",
  "onSurfaceVariant",
  "surfaceContainerLowest",
  "surfaceContainerLow",
  "surfaceContainer",
  "surfaceContainerHigh",
  "surfaceContainerHighest",
  "outline",
  "outlineVariant",
  "inverseSurface",
  "inverseOnSurface",
  null,
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
  null,
  "error",
  "onError",
  "errorContainer",
  "onErrorContainer",
];

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const lines = ROLES.map((role) => (role ? `  --color-${kebab(role)}: ${hexFromArgb(C[role].getArgb(scheme))};` : ""));

// Status colours are not Material roles: tonal palettes at a fixed hue, so "paid" stays green and
// "pending" amber whatever the seed. Tone 40 for text/icons, 90 for containers, 30 on containers.
for (const [name, hue] of [
  ["success", 145],
  ["warning", 70],
]) {
  const palette = TonalPalette.fromHueAndChroma(hue, 48);
  lines.push(`  --color-${name}: ${hexFromArgb(palette.tone(40))};`);
  lines.push(`  --color-${name}-container: ${hexFromArgb(palette.tone(90))};`);
  lines.push(`  --color-on-${name}-container: ${hexFromArgb(palette.tone(30))};`);
}

console.log(lines.join("\n"));
