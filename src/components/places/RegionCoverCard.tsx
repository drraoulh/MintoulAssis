'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { REGIONS, type RegionMeta } from '@/lib/regions';

export function RegionCoverCard({
  region,
  count,
  locale = 'fr',
  active = false,
  href,
  onClick,
}: {
  region: RegionMeta;
  count?: number;
  locale?: 'fr' | 'en';
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const name = locale === 'fr' ? region.nameFr : region.nameEn;
  const capital = locale === 'fr' ? region.capitalFr : region.capitalEn;
  const [imgOk, setImgOk] = useState(true);
  const className = `group relative block overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 ${
    active
      ? 'border-[var(--gold)] ring-1 ring-[var(--gold)]/40'
      : 'border-[var(--line)]'
  }`;

  const body = (
    <>
      <div className="relative aspect-[16/10] bg-[var(--green-deep)] sm:aspect-[5/3]">
        {imgOk ? (
          <Image
            src={region.coverImage}
            alt={`Région ${name}`}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width:768px) 50vw, 20vw"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(145deg, #007A5E 0%, #0B3D2E 45%, #CE1126 100%)',
            }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white sm:p-3">
          <p className="text-sm font-semibold leading-tight sm:text-base">{name}</p>
          <p className="mt-0.5 text-[11px] text-white/80 sm:text-xs">
            {capital}
            {typeof count === 'number' && count > 0
              ? ` · ${count} site${count > 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`w-full ${className}`}>
      {body}
    </button>
  );
}

export function RegionCoverGrid({
  counts,
  locale = 'fr',
}: {
  counts?: Record<string, number>;
  locale?: 'fr' | 'en';
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {REGIONS.map((r) => (
        <RegionCoverCard
          key={r.id}
          region={r}
          count={counts?.[r.id]}
          locale={locale}
          href={`/explorer?region=${encodeURIComponent(r.apiRegion)}`}
        />
      ))}
    </div>
  );
}
