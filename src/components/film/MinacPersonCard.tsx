'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

import type { PersonUI } from '@/lib/types';

export function MinacPersonCard({ person }: { person: PersonUI }) {
  const photo = person.photoUrl?.trim();
  return (
    <article className="overflow-hidden rounded-2xl border border-[#FCD116]/25 bg-black/40">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-36 sm:w-28">
          {photo ? (
            <Image
              src={photo}
              alt={person.name}
              fill
              className="object-cover object-top"
              sizes="112px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">
              MINAC
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FCD116]">
            {person.sourceLabel || 'MINAC'}
          </p>
          <h3 className="mt-1 font-display text-base font-bold leading-snug text-[#F8F5ED] sm:text-lg">
            {person.name}
          </h3>
          {person.title ? (
            <p className="mt-1.5 text-sm font-medium leading-snug text-white/85">
              {person.title}
            </p>
          ) : null}
          {person.organization ? (
            <p className="mt-1 text-xs text-white/45">{person.organization}</p>
          ) : null}
          {person.sourceUrl ? (
            <a
              href={person.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FCD116] hover:underline"
            >
              Organigramme officiel
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MinacPersonCards({ people }: { people: PersonUI[] }) {
  if (!people?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {people.map((p) => (
        <MinacPersonCard key={p.id || p.name} person={p} />
      ))}
    </div>
  );
}
