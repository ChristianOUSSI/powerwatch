// Génère les icônes PWA (icon-192.png, icon-512.png).
// Dégradé orange vertical + éclair blanc, coins arrondis, zone sûre maskable.
// Usage : node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

// ---- Couleurs ----
const TOP = [255, 171, 92];     // #ffab5c  (haut, clair)
const BOTTOM = [234, 88, 12];   // #ea580c  (bas, profond)
const BOLT = [255, 255, 255];

// Éclair centré, échelle ~0.72 pour rester dans la zone sûre maskable (80 %)
const RAW_BOLT = [
  [0.60, 0.04], [0.36, 0.54], [0.50, 0.54],
  [0.45, 0.96], [0.72, 0.42], [0.57, 0.42],
];
const SCALE = 0.72;
const BOLT_POLY = RAW_BOLT.map(([x, y]) => [
  0.5 + (x - 0.5) * SCALE,
  0.5 + (y - 0.5) * SCALE,
]);

function lerp(a, b, t) { return a + (b - a) * t; }

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inRoundedRect(u, v, radius) {
  const qx = Math.abs(u - 0.5) - (0.5 - radius);
  const qy = Math.abs(v - 0.5) - (0.5 - radius);
  if (qx > 0 && qy > 0) return qx * qx + qy * qy <= radius * radius;
  return qx <= 0 || qy <= 0;
}

function bgColor(v) {
  const t = Math.min(1, Math.max(0, v));
  // léger assombrissement vers les coins pour du relief
  return [
    Math.round(lerp(TOP[0], BOTTOM[0], t)),
    Math.round(lerp(TOP[1], BOTTOM[1], t)),
    Math.round(lerp(TOP[2], BOTTOM[2], t)),
  ];
}

function render(size) {
  const radius = 0.22;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filtre None
    const v = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const vv = (y + 0.5) / size;
      const o = row + 1 + x * 4;
      if (!inRoundedRect(u, vv, radius)) {
        raw[o + 3] = 0;
        continue;
      }
      if (inPolygon(u, vv, BOLT_POLY)) {
        // léger dégradé sur l'éclair : plus lumineux en haut
        const c = BOLT;
        const shade = 1 - vv * 0.06;
        raw[o]     = Math.min(255, Math.round(c[0] * shade));
        raw[o + 1] = Math.min(255, Math.round(c[1] * shade));
        raw[o + 2] = Math.min(255, Math.round(c[2] * shade));
        raw[o + 3] = 255;
      } else {
        const c = bgColor(v);
        raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`OK ${file}`);
}
