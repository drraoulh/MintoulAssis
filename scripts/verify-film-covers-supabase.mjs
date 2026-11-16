import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = {};
for (const line of readFileSync(resolve('.env.local'), 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const base = (env.NEXT_PUBLIC_FILM_COVERS_BASE_URL || '').replace(/\/$/, '');

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!base) {
  console.error('Missing NEXT_PUBLIC_FILM_COVERS_BASE_URL');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: buckets, error: be } = await sb.storage.listBuckets();
if (be) {
  console.error('listBuckets', be.message);
  process.exit(1);
}
console.log('buckets', buckets.map((b) => b.name).join(', '));

async function countFolder(prefix) {
  let total = 0;
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from('film-covers').list(prefix, {
      limit: 1000,
      offset,
    });
    if (error) throw new Error(`${prefix}: ${error.message}`);
    const files = (data || []).filter((f) => f.id);
    total += files.length;
    if ((data || []).length < 1000) break;
    offset += 1000;
  }
  return total;
}

const ayilaa = await countFolder('ayilaa');
const villages = await countFolder('villages');
console.log(JSON.stringify({ ayilaa, villages, base }, null, 2));

const { data: sample } = await sb.storage.from('film-covers').list('ayilaa', { limit: 1 });
const name = sample?.find((f) => f.id)?.name;
if (!name) {
  console.error('No sample file in ayilaa/');
  process.exit(1);
}
const publicUrl = `${base}/ayilaa/${name}`;
const res = await fetch(publicUrl, { method: 'HEAD' });
console.log('sample', publicUrl, 'status', res.status, res.headers.get('content-type'));
if (!res.ok) process.exit(1);
console.log('OK — covers are publicly reachable');
