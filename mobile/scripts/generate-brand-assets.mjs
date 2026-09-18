import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const outDir = 'assets/brand/generated';
await mkdir(outDir, { recursive: true });

const assets = [
  ['assets/brand/app-icon.svg', `${outDir}/app-icon.png`],
  ['assets/brand/adaptive-foreground.svg', `${outDir}/adaptive-foreground.png`],
  ['assets/brand/monochrome-icon.svg', `${outDir}/monochrome-icon.png`],
];

for (const [input, output] of assets) {
  await sharp(input, { density: 300 })
    .resize(1024, 1024, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`generated ${output}`);
}
