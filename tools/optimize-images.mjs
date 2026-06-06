import sharp from 'sharp';
import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const JPEG_QUALITY = 85;
const WEBP_QUALITY = 80;
const INLINE_MAX_WIDTH = 1200;

const imagesToOptimize = [
  'biberach-an-der-riss-modern.jpg',
  'portarlington-emo-park-c1900-nli-eason.jpg',
  'jersey-1942-deportation-notice.jpg',
  'duleek-old-churchyard-st-kienans.jpg',
  'clonliffe-road-drumcondra.jpg',
  'holy-cross-church-dundrum.jpg',
  'nli-lawrence-clonliffe-cardinal-cullen-tomb-52006198805.jpg',
  'nli-lawrence-glasnevin-aerial-35284885854.jpg',
  'nli-lawrence-river-liffey-dublin-36918524193.jpg',
  'nli-lawrence-college-green-dublin-36938784044.jpg',
  'nli-eason-ranelagh-village-53449679143.jpg',
].map((fileName) => ({
  file: path.join('images', 'illustrations', fileName),
  maxWidth: INLINE_MAX_WIDTH,
}));

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function savedPercent(before, after) {
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

let totalBefore = 0;
let totalAfterJpeg = 0;
let totalWebp = 0;

for (const image of imagesToOptimize) {
  const inputPath = path.resolve(image.file);
  const webpPath = inputPath.replace(/\.jpe?g$/i, '.webp');
  const before = await stat(inputPath);
  const beforeMetadata = await sharp(inputPath).metadata();
  const source = sharp(inputPath, { limitInputPixels: false })
    .rotate()
    .resize({ width: image.maxWidth, withoutEnlargement: true });

  const [jpegBuffer, webpBuffer] = await Promise.all([
    source.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
    source.clone().webp({ quality: WEBP_QUALITY }).toBuffer(),
  ]);

  await writeFile(inputPath, jpegBuffer);
  await writeFile(webpPath, webpBuffer);

  const [afterJpeg, afterWebp] = await Promise.all([stat(inputPath), stat(webpPath)]);
  const afterMetadata = await sharp(inputPath).metadata();

  totalBefore += before.size;
  totalAfterJpeg += afterJpeg.size;
  totalWebp += afterWebp.size;

  console.log(
    `${image.file}: ${formatBytes(before.size)} ${beforeMetadata.width}x${beforeMetadata.height}`
    + ` -> ${formatBytes(afterJpeg.size)} ${afterMetadata.width}x${afterMetadata.height}`
    + ` (${savedPercent(before.size, afterJpeg.size)} saved); WebP ${formatBytes(afterWebp.size)}`,
  );
}

console.log(`JPEG total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfterJpeg)} (${savedPercent(totalBefore, totalAfterJpeg)} saved)`);
console.log(`WebP total: ${formatBytes(totalWebp)}`);
