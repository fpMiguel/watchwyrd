/**
 * Generate logo variants from source logo
 *
 * Usage: node scripts/generate-logos.js
 *
 * Source: docs/assets/logo.png
 * Output: src/web/public/
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const sourceLogo = path.join(rootDir, 'docs/assets/logo.png');
const targetDir = path.join(rootDir, 'src/web/public');

const LOGO_SIZES = [
  { name: 'favicon.png', size: 32, description: 'Browser favicon' },
  { name: 'logo.png', size: 80, description: 'Wizard header logo' },
  { name: 'icon.png', size: 128, description: 'General icon' },
  { name: 'logo-large.png', size: 256, description: 'Stremio manifest logo' },
];

async function generateLogos() {
  // Check source exists
  if (!fs.existsSync(sourceLogo)) {
    console.error(`❌ Source logo not found: ${sourceLogo}`);
    process.exit(1);
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`📦 Generating logos from ${sourceLogo}\n`);

  for (const { name, size, description } of LOGO_SIZES) {
    const outputPath = path.join(targetDir, name);

    await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(
      `✅ ${name.padEnd(16)} ${size}x${size}  (${(stats.size / 1024).toFixed(1)}KB) - ${description}`
    );
  }

  console.log(`\n🎉 All logos generated in ${targetDir}`);
}

generateLogos().catch((err) => {
  console.error('❌ Error generating logos:', err.message);
  process.exit(1);
});
