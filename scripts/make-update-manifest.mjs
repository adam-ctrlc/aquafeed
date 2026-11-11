#!/usr/bin/env node
/**
 * Turns the output of `npx expo export --platform android` into a self-hosted update:
 * writes manifest.json (the file the installed app checks) next to the exported files.
 *
 *   node scripts/make-update-manifest.mjs <export dir> <public base URL of that dir>
 */
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, baseUrlArg] = process.argv.slice(2);
if (!dir || !baseUrlArg) {
  console.error('Usage: make-update-manifest.mjs <export dir> <public base URL>');
  process.exit(1);
}
const baseUrl = baseUrlArg.replace(/\/+$/, '');
const platform = 'android';

const metadata = JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8'));
const files = metadata.fileMetadata?.[platform];
if (!files?.bundle) throw new Error(`No ${platform} bundle in metadata.json. Export with --platform ${platform}.`);

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
  json: 'application/json', xml: 'text/xml', mp3: 'audio/mpeg', mp4: 'video/mp4',
};

function describe(relPath) {
  const full = join(dir, relPath);
  if (!existsSync(full)) throw new Error(`Missing exported file: ${relPath}`);
  const data = readFileSync(full);
  return {
    // The app verifies every download against this SHA-256 (base64url, no padding).
    hash: createHash('sha256').update(data).digest('base64url'),
    key: createHash('md5').update(data).digest('hex'),
    url: `${baseUrl}/${relPath.split('/').map(encodeURIComponent).join('/')}`,
  };
}

// The app config that this update should run with (same as the build's, minus private fields).
const expoClient = JSON.parse(
  execFileSync('npx', ['expo', 'config', '--json', '--type', 'public'], { encoding: 'utf8' }),
);
const runtimeVersion =
  typeof expoClient.runtimeVersion === 'string' ? expoClient.runtimeVersion : expoClient.version;

const manifest = {
  id: randomUUID(),
  createdAt: new Date().toISOString(),
  runtimeVersion,
  launchAsset: { ...describe(files.bundle), contentType: 'application/javascript' },
  assets: files.assets.map((a) => ({
    ...describe(a.path),
    contentType: MIME[a.ext] ?? 'application/octet-stream',
    fileExtension: `.${a.ext}`,
  })),
  metadata: {},
  extra: { expoClient },
};

writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
console.log(
  `Update ${manifest.id} for runtime ${runtimeVersion}: 1 bundle, ${manifest.assets.length} assets -> ${baseUrl}/manifest.json`,
);
