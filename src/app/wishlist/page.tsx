'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, MessageCircle, Sparkles, Trash2 } from 'lucide-react';

import { PageTransition } from '@/components/motion';
import { Button, EmptyState } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { useWishlist } from '@/lib/use-wishlist';
import {
  buildWishlistItineraryPrompt,
  wishlistPlaceHref,
} from '@/lib/wishlist-store';

export default function WishlistPage() {
  const { t, locale } = useLocale();
  const { items, ready, remove } = useWishlist();

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--line)]" />
      </div>
    );
  }

  const aiHref =
    items.length > 0
      ? `/assistant?q=${encodeURIComponent(
          buildWishlistItineraryPrompt(items, locale),
        )}`
      : '/assistant';

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <header className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('wishlist.eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[var(--green-deep)] sm:text-4xl">
            {t('wishlist.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            {t('wishlist.hub')}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={t('wishlist.emptyTitle')}
              body={t('wishlist.emptyBody')}
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button href="/explorer" className="w-full sm:w-auto">
                {t('nav.explorer')}
              </Button>
              <Button href="/destinations" variant="secondary" className="w-full sm:w-auto">
                {t('nav.destinations')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--muted)]">
                {t('wishlist.count', { count: items.length })}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button href={aiHref} size="sm" className="w-full justify-center sm:w-auto">
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  {t('wishlist.generateAi')}
                </Button>
                <Button
                  href="/mon-voyage"
                  size="sm"
                  variant="outline"
                  className="w-full justify-center sm:w-auto"
                >
                  {t('nav.trip')}
                </Button>
              </div>
            </div>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((place) => {
                const href = wishlistPlaceHref(place);
                return (
                  <li
                    key={place.id}
                    className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-soft)]"
                  >
                    <Link href={href} className="block">
                      <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--green-deep)] via-[var(--green)] to-[var(--gold)]/30">
                        {place.imageUrl ? (
                          <Image
                            src={place.imageUrl}
                            alt={place.name}
                            fill
                            className="object-cover"
                            sizes="(max-width:768px) 100vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-end p-4">
                            <Heart className="h-8 w-8 text-white/70" aria-hidden />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="space-y-2 p-4">
                      <div>
                        <h2 className="font-display text-lg font-semibold leading-snug text-[var(--green-deep)]">
                          <Link href={href} className="hover:underline">
                            {place.name}
                          </Link>
                        </h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {[place.city, place.region].filter(Boolean).join(', ') ||
                            'Cameroun'}
                        </p>
                        {place.category ? (
                          <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                            {place.category}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button href={href} size="sm" variant="secondary">
                          {t('place.discover')}
                        </Button>
                        <Button
                          href={`/assistant?q=${encodeURIComponent(
                            locale === 'en'
                              ? `Tell me about ${place.name}`
                              : `Parle-moi de ${place.name}`,
                          )}`}
                          size="sm"
                          variant="outline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                          {t('wishlist.askAbout')}
                        </Button>
                        <button
                          type="button"
                          onClick={() => remove(place.id)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--muted)] transition hover:border-[#CE1126]/40 hover:text-[#CE1126]"
                          aria-label={t('wishlist.remove')}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          {t('wishlist.remove')}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <section className="mt-8 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--mint-soft)]/50 p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-[var(--green-deep)]">
                {t('wishlist.aiTitle')}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{t('wishlist.aiBody')}</p>
              <Button href={aiHref} className="mt-4">
                <Sparkles className="h-4 w-4" aria-hidden />
                {t('wishlist.generateAi')}
              </Button>
            </section>
          </>
        )}
      </div>
    </PageTransition>
  );
}
