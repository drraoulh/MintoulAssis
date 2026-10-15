'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Landmark, Mountain, Trees, Waves } from 'lucide-react';

import { PageTransition, SlideUp } from '@/components/motion';
import { Button } from '@/components/ui';
import { useLocale } from '@/lib/i18n';

const AREAS = [
  {
    id: 'soudano',
    icon: Mountain,
    href: '/destinations?region=Extr%C3%AAme-Nord',
    image: '/regions/extreme-nord.jpg',
    titleKey: 'culture.area.soudano.title',
    regionsKey: 'culture.area.soudano.regions',
    bodyKey: 'culture.area.soudano.body',
  },
  {
    id: 'grassfields',
    icon: Landmark,
    href: '/destinations?region=Ouest',
    image: '/regions/ouest.jpg',
    titleKey: 'culture.area.grassfields.title',
    regionsKey: 'culture.area.grassfields.regions',
    bodyKey: 'culture.area.grassfields.body',
  },
  {
    id: 'fang',
    icon: Trees,
    href: '/destinations?region=Centre',
    image: '/regions/centre.jpg',
    titleKey: 'culture.area.fang.title',
    regionsKey: 'culture.area.fang.regions',
    bodyKey: 'culture.area.fang.body',
  },
  {
    id: 'sawa',
    icon: Waves,
    href: '/destinations?region=Littoral',
    image: '/regions/littoral.jpg',
    titleKey: 'culture.area.sawa.title',
    regionsKey: 'culture.area.sawa.regions',
    bodyKey: 'culture.area.sawa.body',
  },
] as const;

const TIMELINE = [
  { titleKey: 'culture.tl.1.title', bodyKey: 'culture.tl.1.body' },
  { titleKey: 'culture.tl.2.title', bodyKey: 'culture.tl.2.body' },
  { titleKey: 'culture.tl.3.title', bodyKey: 'culture.tl.3.body' },
  { titleKey: 'culture.tl.4.title', bodyKey: 'culture.tl.4.body' },
] as const;

export default function CulturePage() {
  const { t, locale } = useLocale();
  const askHref =
    locale === 'en'
      ? '/assistant?q=' + encodeURIComponent(t('assistant.sug.cultureQ'))
      : '/assistant?q=Parle-moi%20de%20la%20culture%20et%20des%20chefferies%20au%20Cameroun';

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <SlideUp>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            {t('culture.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[var(--green-deep)]">
            {t('culture.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">{t('culture.sub')}</p>
        </SlideUp>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {AREAS.map((area) => (
            <Link
              key={area.id}
              href={area.href}
              className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              <div className="relative aspect-[16/9] bg-[var(--green-deep)]">
                <Image
                  src={area.image}
                  alt={t(area.titleKey)}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-5 text-white">
                  <area.icon className="mb-2 h-5 w-5 text-[var(--gold)]" aria-hidden />
                  <h2 className="font-display text-xl font-semibold">{t(area.titleKey)}</h2>
                  <p className="mt-1 text-xs text-white/75">{t(area.regionsKey)}</p>
                </div>
              </div>
              <p className="p-5 text-sm text-[var(--muted)]">{t(area.bodyKey)}</p>
            </Link>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-3xl font-bold text-[var(--green-deep)]">
            {t('culture.timeline')}
          </h2>
          <p className="mt-2 text-[var(--muted)]">{t('culture.timelineSub')}</p>
          <ol className="mt-8 space-y-4">
            {TIMELINE.map((item, i) => (
              <li
                key={item.titleKey}
                className="rounded-2xl border border-[var(--line)] bg-white px-5 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gold)]">
                  {i + 1}. {t(item.titleKey)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{t(item.bodyKey)}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button href={askHref}>
            {t('culture.ask')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button href="/explorer" variant="outline">
            {t('culture.explore')}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
