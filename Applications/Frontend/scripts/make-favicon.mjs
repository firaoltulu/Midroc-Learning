// Builds public/favicon.svg (and the PNG fallback) from the brand mark.
// The SVG is square, embeds the light and dark marks, and switches with the browser's
// color scheme so the mark stays visible on light and dark tab bars.
// Re-run after replacing the brand files: node scripts/make-favicon.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'src/shared/ui/brand');
const out = join(root, 'public');

/** Reads width/height from a PNG header. */
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const light = readFileSync(join(brand, 'mark-light.png'));
const dark = readFileSync(join(brand, 'mark-dark.png'));
const { width, height } = pngSize(light);
const side = Math.max(width, height);
const x = (side - width) / 2;
const y = (side - height) / 2;
const image = (cls, png) =>
  `<image class="${cls}" x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}">
<style>.dark{display:none}@media (prefers-color-scheme: dark){.light{display:none}.dark{display:inline}}</style>
${image('light', light)}
${image('dark', dark)}
</svg>
`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'favicon.svg'), svg);
copyFileSync(join(brand, 'mark-light.png'), join(out, 'favicon.png'));
console.log(`favicon.svg (${side}x${side}) and favicon.png written to public/`);
