/**
 * Uploads public/film/covers/** to a public Supabase Storage bucket `film-covers`.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=
 *
 * Usage:
 *   node scripts/upload-film-covers-supabase.mjs
 *   node scripts/upload-film-covers-supabase.mjs --dry-run
 *   node scripts/upload-film-covers-supabase.mjs --limit=50
 */
import { createClient } from '@supabase/supabase-js';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const COVERS_DIR = resolve(ROOT, 'public/film/covers');
const BUCKET = 'film-covers';
const CONCURRENCY = 6;
const DRY = process.argv.includes('--dry-run');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || 0) || 0;

function loadEnv() {
  const envFile = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of envFile.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(jpe?g|png|webp|gif)$/i.test(name)) out.push(p);
  }
  return out;
}

function contentType(file) {
  const e = extname(file).toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  if (e === '.gif') return 'image/gif';
  return 'image/jpeg';
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
Missing Supabase credentials in .env.local.

Add:
  SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings → API → service_role)

NEXT_PUBLIC_SUPABASE_URL is ${url ? 'set' : 'MISSING'}.
SUPABASE_SERVICE_ROLE_KEY is ${serviceKey ? 'set' : 'MISSING'}.
`);
  process.exit(1);
}

if (!existsSync(COVERS_DIR)) {
  console.error(`No covers directory at ${COVERS_DIR}`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
if (listErr) {
  console.error('listBuckets failed:', listErr.message);
  process.exit(1);
}

if (!buckets?.some((b) => b.name === BUCKET)) {
  console.log(`Creating public bucket "${BUCKET}"…`);
  if (!DRY) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error('createBucket failed:', error.message);
      process.exit(1);
    }
  }
} else {
  console.log(`Bucket "${BUCKET}" already exists`);
}

let files = walk(COVERS_DIR);
if (LIMIT > 0) files = files.slice(0, LIMIT);
console.log(`Files to upload: ${files.length}${DRY ? ' (dry-run)' : ''}`);

let ok = 0;
let skip = 0;
let fail = 0;

await mapPool(files, CONCURRENCY, async (file, idx) => {
  const objectPath = relative(COVERS_DIR, file).replace(/\\/g, '/');
  if (DRY) {
    if (idx < 5) console.log(`dry ${objectPath}`);
    ok++;
    return;
  }

  // Skip if already present (list is expensive; try upload upsert instead)
  const body = readFileSync(file);
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType: contentType(file),
    upsert: true,
    cacheControl: '31536000',
  });

  if (error) {
    fail++;
    if (fail <= 15) console.warn(`FAIL ${objectPath}: ${error.message}`);
  } else {
    ok++;
  }

  if ((ok + fail) % 100 === 0) {
    console.log(`progress ok=${ok} fail=${fail} / ${files.length}`);
  }
});

const publicBase = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}`;
console.log(
  JSON.stringify(
    {
      bucket: BUCKET,
      ok,
      skip,
      fail,
      publicBase,
      envHint: `NEXT_PUBLIC_FILM_COVERS_BASE_URL=${publicBase}`,
    },
    null,
    2,
  ),
);
