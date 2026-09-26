/**
 * Push .env.local keys to Vercel (production + preview).
 * Usage: node scripts/push-vercel-env.mjs
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SKIP = new Set(['VERCEL_OIDC_TOKEN', 'VERCEL_URL', 'VERCEL']);

const envText = readFileSync('.env.local', 'utf8');
const vars = {};
for (const line of envText.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 1) continue;
  const key = t.slice(0, i).trim();
  const val = t.slice(i + 1).trim();
  if (!key || !val || SKIP.has(key)) continue;
  vars[key] = val;
}

const targets = ['production', 'preview'];
const keys = Object.keys(vars);
const logPath = 'tmp/vercel-env.log';
writeFileSync(logPath, `Pushing ${keys.length} env vars…\n`);

let ok = 0;
let fail = 0;
for (const key of keys) {
  const isPublic = key.startsWith('NEXT_PUBLIC_');
  for (const target of targets) {
    const args = [
      'vercel',
      'env',
      'add',
      key,
      target,
      '--value',
      vars[key],
      '--yes',
      '--force',
      isPublic ? '--no-sensitive' : '--sensitive',
    ];
    const r = spawnSync('npx', args, {
      encoding: 'utf8',
      shell: true,
      timeout: 120_000,
    });
    const detail = `${r.stdout || ''}\n${r.stderr || ''}`.replace(/\s+/g, ' ').trim();
    const success = r.status === 0 && /Overrode|Created|Saved/i.test(detail);
    const line = success
      ? `✓ ${key} → ${target}`
      : `✗ ${key} → ${target}: ${detail.slice(0, 220)}`;
    if (success) ok += 1;
    else fail += 1;
    appendFileSync(logPath, `${line}\n`);
    console.log(line);
  }
}
const summary = `Done. ok=${ok} fail=${fail}`;
appendFileSync(logPath, `${summary}\n`);
console.log(summary);
