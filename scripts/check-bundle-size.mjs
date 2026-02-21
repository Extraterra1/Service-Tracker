import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const distAssetsDir = resolve(process.cwd(), 'dist/assets');
const MAIN_JS_GZIP_WARN_BYTES = 170 * 1024;
const SECONDARY_JS_GZIP_WARN_BYTES = 120 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} kB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function isTrackedAsset(name) {
  return name.endsWith('.js') || name.endsWith('.css');
}

function getAssets() {
  const files = readdirSync(distAssetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isTrackedAsset(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return files.map((fileName) => {
    const filePath = join(distAssetsDir, fileName);
    const content = readFileSync(filePath);
    const rawBytes = statSync(filePath).size;
    const gzipBytes = gzipSync(content).byteLength;

    return {
      fileName,
      rawBytes,
      gzipBytes,
      type: fileName.endsWith('.css') ? 'css' : 'js'
    };
  });
}

function printAssetTable(assets) {
  const maxName = Math.max(...assets.map((asset) => asset.fileName.length), 12);
  const namePad = Math.max(22, maxName + 2);

  console.log('Bundle size report (dist/assets)');
  console.log(`${'Asset'.padEnd(namePad)}${'Type'.padEnd(8)}${'Raw'.padEnd(14)}Gzip`);
  console.log('-'.repeat(namePad + 8 + 14 + 8));

  assets.forEach((asset) => {
    console.log(
      `${asset.fileName.padEnd(namePad)}${asset.type.padEnd(8)}${formatBytes(asset.rawBytes).padEnd(14)}${formatBytes(asset.gzipBytes)}`
    );
  });
}

function pickMainJsChunk(jsAssets) {
  return jsAssets.find((asset) => /^index-.*\.js$/.test(asset.fileName)) ?? jsAssets[0] ?? null;
}

function run() {
  let assets = [];

  try {
    assets = getAssets();
  } catch (error) {
    console.warn(`[bundle-check] Could not read dist assets at ${distAssetsDir}: ${error.message}`);
    process.exit(0);
  }

  if (assets.length === 0) {
    console.warn(`[bundle-check] No JS/CSS assets found in ${distAssetsDir}.`);
    process.exit(0);
  }

  printAssetTable(assets);

  const jsAssets = assets
    .filter((asset) => asset.type === 'js')
    .sort((a, b) => b.gzipBytes - a.gzipBytes);

  const warnings = [];

  const mainChunk = pickMainJsChunk(jsAssets);
  if (mainChunk && mainChunk.gzipBytes > MAIN_JS_GZIP_WARN_BYTES) {
    warnings.push(
      `Main chunk ${mainChunk.fileName} is ${formatBytes(mainChunk.gzipBytes)} gzip (warn > ${formatBytes(MAIN_JS_GZIP_WARN_BYTES)}).`
    );
  }

  const secondaryChunk = jsAssets.find((asset) => asset.fileName !== mainChunk?.fileName) ?? null;
  if (secondaryChunk && secondaryChunk.gzipBytes > SECONDARY_JS_GZIP_WARN_BYTES) {
    warnings.push(
      `Secondary JS chunk ${secondaryChunk.fileName} is ${formatBytes(secondaryChunk.gzipBytes)} gzip (warn > ${formatBytes(SECONDARY_JS_GZIP_WARN_BYTES)}).`
    );
  }

  if (warnings.length > 0) {
    console.warn('\nSoft bundle warnings:');
    warnings.forEach((warning) => {
      console.warn(`- ${warning}`);
    });
  } else {
    console.log('\nSoft bundle check: no warnings.');
  }
}

run();
