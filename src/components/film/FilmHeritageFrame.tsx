'use client';

import Image from 'next/image';

/**
 * Cameroon heritage framing for the cinema section —
 * Toghu (black / red / gold embroidery) and Ndop (indigo) accents.
 */
export function FilmHeritageRails({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 left-0 right-0 z-[1] hidden lg:block ${className}`}
    >
      <div className="cine-heritage-rail cine-heritage-rail--left" />
      <div className="cine-heritage-rail cine-heritage-rail--right" />
    </div>
  );
}

export function FilmHeritageStrip({
  className = '',
  variant = 'toghu',
}: {
  className?: string;
  variant?: 'toghu' | 'ndop';
}) {
  const src =
    variant === 'ndop'
      ? '/film/culture/ndop-tile.jpg'
      : '/film/culture/toghu-footer.png';

  return (
    <div
      aria-hidden
      className={`cine-heritage-strip cine-heritage-strip--${variant} ${className}`}
    >
      <Image
        src={src}
        alt=""
        width={1600}
        height={200}
        sizes="100vw"
        className="cine-heritage-strip__img"
        priority={false}
      />
    </div>
  );
}

export function FilmHeritageWash({
  className = '',
  intensity = 'soft',
}: {
  className?: string;
  intensity?: 'soft' | 'medium';
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 cine-heritage-wash cine-heritage-wash--${intensity} ${className}`}
    />
  );
}

/** Visible Toghu fabric band for the cinema footer. */
export function FilmHeritageFooterBand() {
  return (
    <div className="cine-heritage-footer-band" aria-hidden>
      <Image
        src="/film/culture/toghu-footer.png"
        alt=""
        width={1600}
        height={400}
        sizes="100vw"
        className="h-full w-full object-cover object-center"
        priority={false}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.35) 100%)',
        }}
      />
    </div>
  );
}
