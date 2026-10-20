'use client';

import {
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  type LucideIcon,
} from 'lucide-react';

import { useLocale } from '@/lib/i18n';
import type { PlaceContact } from '@/lib/film/types';

function telHref(phone: string) {
  return `tel:${phone.split(/[;,/]/)[0].replace(/[^\d+]/g, '')}`;
}

function waHref(num: string) {
  const digits = num.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('237') ? digits : `237${digits}`}`;
}

function siteHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function Row({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 py-2.5 last:border-b-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FCD116]" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{label}</p>
        {href ? (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="break-words text-sm font-medium text-[#F8F5ED] hover:text-[#FCD116]"
          >
            {value}
          </a>
        ) : (
          <p className="break-words text-sm font-medium text-[#F8F5ED]">{value}</p>
        )}
      </div>
    </div>
  );
}

/** Contact + position details for a hotel, villa or rental shop. */
export function PlaceContactCard({
  contact,
  city,
  latitude,
  longitude,
}: {
  contact?: PlaceContact;
  city?: string;
  latitude: number;
  longitude: number;
}) {
  const { locale } = useLocale();
  const fr = locale === 'fr';
  const c = contact ?? {};
  const address = [c.address, city].filter(Boolean).join(', ');
  const hasDetails = Boolean(c.phone || c.whatsapp || c.email || c.website || c.facebook || c.openingHours);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3">
      {address ? <Row icon={MapPin} label={fr ? 'Adresse' : 'Address'} value={address} /> : null}
      <Row
        icon={Navigation}
        label={fr ? 'Position GPS' : 'GPS position'}
        value={`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
        href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
      />
      {c.phone ? <Row icon={Phone} label={fr ? 'Téléphone' : 'Phone'} value={c.phone} href={telHref(c.phone)} /> : null}
      {c.whatsapp ? <Row icon={MessageCircle} label="WhatsApp" value={c.whatsapp} href={waHref(c.whatsapp)} /> : null}
      {c.email ? <Row icon={Mail} label="Email" value={c.email} href={`mailto:${c.email}`} /> : null}
      {c.website ? (
        <Row
          icon={Globe}
          label={fr ? 'Site web' : 'Website'}
          value={c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          href={siteHref(c.website)}
        />
      ) : null}
      {c.facebook ? <Row icon={Globe} label="Facebook" value="Facebook" href={siteHref(c.facebook)} /> : null}
      {c.openingHours ? (
        <Row icon={Clock} label={fr ? 'Horaires' : 'Opening hours'} value={c.openingHours} />
      ) : null}
      {!hasDetails ? (
        <p className="py-2 text-xs text-white/45">
          {fr
            ? 'Coordonnées non renseignées — rendez-vous sur place ou utilisez l’itinéraire.'
            : 'No contact details listed — visit in person or use directions.'}
        </p>
      ) : null}
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#007A5E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#00614b]"
      >
        <Navigation className="h-4 w-4" aria-hidden />
        {fr ? 'Itinéraire' : 'Directions'}
      </a>
    </div>
  );
}
