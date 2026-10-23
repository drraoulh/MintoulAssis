'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { useState } from 'react';

import type { PersonUI } from '@/lib/types';

export function PersonProfileCard({ person }: { person: PersonUI }) {
  const [broken, setBroken] = useState(false);
  const photo = broken ? undefined : person.photoUrl?.trim();
  return (
    <article className="overflow-hidden rounded-2xl border border-[#F5E80C]/25 bg-black/40">
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-36 sm:w-28">
          {photo ? (
            <Image
              src={photo}
              alt={person.name}
              fill
              className="object-cover object-top"
              sizes="112px"
              unoptimized
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-white/35">
              <User className="h-7 w-7" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Photo
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-snug text-[#F8F5ED] sm:text-lg">
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
        </div>
      </div>
    </article>
  );
}

export function PersonProfileCards({ people }: { people: PersonUI[] }) {
  if (!people?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {people.map((p) => (
        <PersonProfileCard key={p.id || p.name} person={p} />
      ))}
    </div>
  );
}

/** @deprecated Use PersonProfileCards — kept for existing imports */
export { PersonProfileCard as MinacPersonCard, PersonProfileCards as MinacPersonCards };
