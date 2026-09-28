import { NextResponse } from 'next/server';

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkCredentials,
  createSessionToken,
} from '@/lib/auth';

function safeNext(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

async function withSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function POST(request: Request) {
  const isForm = !(request.headers.get('content-type') ?? '').includes('application/json');

  if (isForm) {
    const form = await request.formData().catch(() => null);
    const username = String(form?.get('username') ?? '');
    const password = String(form?.get('password') ?? '');
    const next = safeNext(form?.get('next'));

    if (!checkCredentials(username, password)) {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', '1');
      if (next !== '/') url.searchParams.set('next', next);
      return NextResponse.redirect(url, 303);
    }
    return withSession(NextResponse.redirect(new URL(next, request.url), 303));
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
  }

  return withSession(NextResponse.json({ ok: true }));
}
