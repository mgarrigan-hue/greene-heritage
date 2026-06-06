import sharp from 'sharp';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const JPEG_QUALITY = 85;
const WEBP_QUALITY = 80;
const INLINE_MAX_WIDTH = 1200;
const ILLUSTRATIONS_DIR = path.join('images', 'illustrations');
const ORIGINALS_DIR = path.join(ILLUSTRATIONS_DIR, '_originals');

const imagesToOptimize = [
  { fileName: 'biberach-an-der-riss-modern.jpg' },
  { fileName: 'portarlington-emo-park-c1900-nli-eason.jpg' },
  { fileName: 'jersey-1942-deportation-notice.jpg' },
  { fileName: 'duleek-old-churchyard-st-kienans.jpg', maxWidth: 1100 },
  { fileName: 'clonliffe-road-drumcondra.jpg' },
  { fileName: 'holy-cross-church-dundrum.jpg', maxWidth: 1150 },
  { fileName: 'nli-lawrence-clonliffe-cardinal-cullen-tomb-52006198805.jpg' },
  { fileName: 'nli-lawrence-glasnevin-aerial-35284885854.jpg' },
  { fileName: 'nli-lawrence-river-liffey-dublin-36918524193.jpg' },
  { fileName: 'nli-lawrence-college-green-dublin-36938784044.jpg' },
  { fileName: 'nli-eason-ranelagh-village-53449679143.jpg' },
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function savedPercent(before, after) {
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

let totalBefore = 0;
let totalAfterJpeg = 0;
let totalWebp = 0;

for (const image of imagesToOptimize) {
  const maxWidth = image.maxWidth ?? INLINE_MAX_WIDTH;
  const outputPath = path.resolve(ILLUSTRATIONS_DIR, image.fileName);
  const originalPath = path.resolve(ORIGINALS_DIR, image.fileName);
  const inputPath = (await fileExists(originalPath)) ? originalPath : outputPath;
  const webpPath = outputPath.replace(/\.jpe?g$/i, '.webp');
  const before = await stat(inputPath);
  const inputBuffer = await readFile(inputPath);
  const beforeMetadata = await sharp(inputBuffer).metadata();
  const source = sharp(inputBuffer, { limitInputPixels: false })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true });

  const [jpegBuffer, webpBuffer] = await Promise.all([
    source.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
    source.clone().webp({ quality: WEBP_QUALITY }).toBuffer(),
  ]);

  await writeFile(outputPath, jpegBuffer);
  await writeFile(webpPath, webpBuffer);

  const [afterJpeg, afterWebp] = await Promise.all([stat(outputPath), stat(webpPath)]);
  const afterMetadata = await sharp(jpegBuffer).metadata();

  totalBefore += before.size;
  totalAfterJpeg += afterJpeg.size;
  totalWebp += afterWebp.size;

  console.log(
    `${path.relative(process.cwd(), outputPath)}: ${formatBytes(before.size)} ${beforeMetadata.width}x${beforeMetadata.height}`
    + ` -> ${formatBytes(afterJpeg.size)} ${afterMetadata.width}x${afterMetadata.height}`
    + ` (${savedPercent(before.size, afterJpeg.size)} saved); WebP ${formatBytes(afterWebp.size)}`,
  );
}

console.log(`JPEG total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfterJpeg)} (${savedPercent(totalBefore, totalAfterJpeg)} saved)`);
console.log(`WebP total: ${formatBytes(totalWebp)}`);
