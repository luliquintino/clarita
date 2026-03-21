import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'logo-clarita.svg');
let svgBuffer;
try {
  svgBuffer = readFileSync(svgPath);
} catch {
  console.error(`Error: logo-clarita.svg not found at ${svgPath}`);
  console.error('Place the SVG in dashboard/public/ and re-run npm run pwa:assets');
  process.exit(1);
}

// Background color matching Clarita brand
const BG = { r: 240, g: 253, b: 244, alpha: 1 }; // #f0fdf4

async function makeIcon(size, filename) {
  const padding = Math.round(size * 0.15);
  const logoSize = size - padding * 2;

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{
      input: await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(publicDir, filename));

  console.log(`✓ ${filename}`);
}

async function makeSplash(width, height, filename) {
  const logoSize = Math.round(Math.min(width, height) * 0.25);

  await sharp({
    create: { width, height, channels: 4, background: BG },
  })
    .composite([{
      input: await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(publicDir, 'splash', filename));

  console.log(`✓ splash/${filename}`);
}

async function main() {
  console.log('Generating PWA assets...\n');

  // Icons
  await makeIcon(192, 'icon-192.png');
  await makeIcon(512, 'icon-512.png');
  await makeIcon(180, 'apple-touch-icon.png');

  // Splash screens (portrait: width x height in px at 1x — stored as full resolution)
  mkdirSync(join(publicDir, 'splash'), { recursive: true });
  await makeSplash(1290, 2796, 'splash-2796x1290.png'); // iPhone 14/15 Pro Max
  await makeSplash(1179, 2556, 'splash-2556x1179.png'); // iPhone 15 Pro
  await makeSplash(1170, 2532, 'splash-2532x1170.png'); // iPhone 14/15
  await makeSplash(750, 1334, 'splash-1334x750.png');   // iPhone SE

  console.log('\n✅ All PWA assets generated successfully.');
}

main().catch(err => { console.error(err); process.exit(1); });
