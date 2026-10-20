/**
 * Branded PDF location dossiers (single location or side-by-side comparison),
 * rendered on the server with @react-pdf/renderer.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';

import { FILM_LOOKS, filmLocationCover } from '@/lib/film/locations';
import { FILM_PROCEDURE_STEPS } from '@/lib/film/procedures';
import type { FilmLocationMeta } from '@/lib/film/types';
import { translate, type Locale } from '@/lib/i18n-dict';
import { REGIONS } from '@/lib/regions';

const C = {
  green: '#007A5E',
  greenDeep: '#00523F',
  red: '#CE1126',
  yellow: '#FCD116',
  /** Readable on white, unlike the flag yellow */
  gold: '#C99A00',
  ink: '#111827',
  body: '#374151',
  muted: '#6B7280',
  line: '#E5E7EB',
  soft: '#F9FAFB',
  cream: '#FFF8E1',
};

// Keep words whole — the default hyphenation splits French words awkwardly ("sen-tier")
Font.registerHyphenationCallback((word) => [word]);

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const A4_HEIGHT = 841.89;
const SITE = 'smartmboatour.com';

type PdfImage = { data: Buffer; format: 'png' | 'jpg' };

const imageCache = new Map<string, PdfImage | null>();

/** Read a /public asset as raw bytes — react-pdf treats Windows paths ("E:\…") as URLs. */
function publicImage(publicPath: string): PdfImage | null {
  if (imageCache.has(publicPath)) return imageCache.get(publicPath)!;
  let img: PdfImage | null = null;
  try {
    const ext = path.extname(publicPath).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      img = {
        data: fs.readFileSync(path.join(PUBLIC_DIR, publicPath.replace(/^\//, ''))),
        format: ext === '.png' ? 'png' : 'jpg',
      };
    }
  } catch {
    img = null;
  }
  imageCache.set(publicPath, img);
  return img;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: C.body,
    lineHeight: 1.45,
  },
  tricolor: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, flexDirection: 'row' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  logo: { width: 64, height: 50, objectFit: 'contain' },
  brandBlock: { flexDirection: 'row', alignItems: 'center' },
  brandText: { marginLeft: 10 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.green, letterSpacing: 0.5 },
  brandSub: { fontSize: 8, color: C.muted, marginTop: 1 },
  docMeta: { alignItems: 'flex-end' },
  docType: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.red,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  docRef: { fontSize: 8, color: C.muted, marginTop: 3 },

  hero: { position: 'relative', height: 185, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  heroImg: { width: '100%', height: '100%', objectFit: 'cover' },
  heroBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingBottom: 11,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroTitle: { fontFamily: 'Helvetica-Bold', fontSize: 21, lineHeight: 1.15, color: '#FFFFFF' },
  heroSub: { fontSize: 9.5, lineHeight: 1.2, color: '#F3F4F6', marginTop: 4 },
  heroFallback: { backgroundColor: C.greenDeep, justifyContent: 'flex-end' },

  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  pill: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.greenDeep,
    backgroundColor: '#E6F4EF',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 5,
    marginBottom: 4,
  },
  pillTourism: { color: '#8A5A00', backgroundColor: C.cream },

  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    marginBottom: 14,
  },
  fact: { width: '33.33%', paddingVertical: 8, paddingHorizontal: 10 },
  factBorderRight: { borderRightWidth: 1, borderRightColor: C.line },
  factBorderTop: { borderTopWidth: 1, borderTopColor: C.line },
  factLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  factValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.ink, marginTop: 2 },
  factLink: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.green, marginTop: 2, textDecoration: 'none' },

  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.ink,
    marginBottom: 8,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48.6%',
    backgroundColor: C.soft,
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardBody: { fontSize: 9.5, color: C.body },

  steps: {
    borderWidth: 1,
    borderColor: '#F3E3A0',
    backgroundColor: C.cream,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 0.5,
  },
  stepNum: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 7.5, lineHeight: 1 },
  stepText: { flex: 1, fontSize: 8.8, lineHeight: 1.4 },
  stepTitle: { fontFamily: 'Helvetica-Bold', color: C.ink },

  // Anchored from the top: `bottom` on fixed absolute views is dropped by react-pdf here
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: A4_HEIGHT - 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 7,
    fontSize: 7.5,
    color: C.muted,
  },
  footerCol: { fontSize: 7.5, color: C.muted },
  footerBrand: { width: '30%', fontFamily: 'Helvetica-Bold', color: C.green },
  footerMid: { width: '55%', textAlign: 'center' },
  footerPage: { width: '15%', textAlign: 'right' },

  // Comparison
  compareTitle: { fontFamily: 'Helvetica-Bold', fontSize: 20, lineHeight: 1.2, color: C.ink },
  compareSub: { fontSize: 10, lineHeight: 1.3, color: C.muted, marginTop: 6, marginBottom: 14 },
  duo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  duoCard: { width: '48.6%', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  duoImg: { width: '100%', height: 130, objectFit: 'cover' },
  duoCaption: { paddingVertical: 8, paddingHorizontal: 10 },
  duoName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.ink },
  duoCity: { fontSize: 8.5, color: C.muted, marginTop: 1 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
  trHead: { flexDirection: 'row', backgroundColor: C.greenDeep },
  trZebra: { backgroundColor: C.soft },
  thLabel: { width: '22%', padding: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  th: { width: '39%', padding: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  tdLabel: {
    width: '22%',
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: C.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  td: { width: '39%', padding: 8, fontSize: 9, color: C.body },
});

type L = {
  t: (key: string) => string;
  fr: boolean;
};

function labels(locale: Locale): L {
  return { t: (key) => translate(locale, key), fr: locale === 'fr' };
}

function locName(loc: FilmLocationMeta, l: L) {
  return l.fr ? loc.nameFr : loc.nameEn;
}

function locCity(loc: FilmLocationMeta, l: L) {
  return l.fr ? loc.cityFr : loc.cityEn;
}

function regionName(loc: FilmLocationMeta, l: L) {
  const r = REGIONS.find((x) => x.id === loc.regionId);
  return r ? (l.fr ? r.nameFr : r.nameEn) : loc.regionId;
}

function looksOf(loc: FilmLocationMeta, l: L): string[] {
  return loc.looks
    .map((id) => {
      const m = FILM_LOOKS.find((x) => x.id === id);
      return l.fr ? m?.fr : m?.en;
    })
    .filter((x): x is string => Boolean(x));
}

function coverPath(loc: FilmLocationMeta): PdfImage | string | null {
  const cover = filmLocationCover(loc);
  if (!cover) return null;
  return /^https?:\/\//.test(cover) ? cover : publicImage(cover);
}

function mapsUrl(loc: FilmLocationMeta) {
  return `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
}

function formatDate(locale: Locale) {
  return new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function docRef(slugs: string[]) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SMF-${slugs.map((x) => x.split('-').map((p) => p[0]).join('').toUpperCase()).join('-')}-${stamp}`;
}

function Tricolor() {
  return (
    <View style={s.tricolor} fixed>
      <View style={{ flex: 1, backgroundColor: C.green }} />
      <View style={{ flex: 1, backgroundColor: C.red }} />
      <View style={{ flex: 1, backgroundColor: C.yellow }} />
    </View>
  );
}

function Header({ l, docType, reference, date }: { l: L; docType: string; reference: string; date: string }) {
  const logo = publicImage('/brand/logo.png');
  return (
    <View style={s.header}>
      <View style={s.brandBlock}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        {logo ? <Image src={logo} style={s.logo} /> : null}
        <View style={s.brandText}>
          <Text style={s.brandName}>SmartMboa Film</Text>
          <Text style={s.brandSub}>
            {l.fr ? 'Bureau de production · Cameroun' : 'Production office · Cameroon'}
          </Text>
        </View>
      </View>
      <View style={s.docMeta}>
        <Text style={s.docType}>{docType}</Text>
        <Text style={s.docRef}>
          {l.fr ? 'Réf.' : 'Ref.'} {reference}
        </Text>
        <Text style={s.docRef}>{date}</Text>
      </View>
    </View>
  );
}

function Footer({ l }: { l: L }) {
  return (
    // Static text in a fixed view inside the page padding is dropped by react-pdf; render() text is not
    <View style={s.footer} fixed>
      <Text style={[s.footerCol, s.footerBrand]} render={() => `SmartMboa Film · ${SITE}`} />
      <Text
        style={[s.footerCol, s.footerMid]}
        render={() =>
          l.fr
            ? 'Dossier préliminaire — à valider lors du repérage'
            : 'Preliminary dossier — verify during scouting'
        }
      />
      <Text
        style={[s.footerCol, s.footerPage]}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function Fact({
  label,
  value,
  href,
  index,
}: {
  label: string;
  value: string;
  href?: string;
  index: number;
}) {
  const style = [
    s.fact,
    ...(index % 3 !== 2 ? [s.factBorderRight] : []),
    ...(index >= 3 ? [s.factBorderTop] : []),
  ];
  return (
    <View style={style}>
      <Text style={s.factLabel}>{label}</Text>
      {href ? (
        <Link src={href} style={s.factLink}>
          {value}
        </Link>
      ) : (
        <Text style={s.factValue}>{value}</Text>
      )}
    </View>
  );
}

function InfoCard({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <View style={[s.card, { borderLeftColor: color }]} wrap={false}>
      <Text style={[s.cardTitle, { color }]}>{title}</Text>
      <Text style={s.cardBody}>{body}</Text>
    </View>
  );
}

function LocationPage({
  loc,
  l,
  reference,
  date,
}: {
  loc: FilmLocationMeta;
  l: L;
  reference: string;
  date: string;
}) {
  const cover = coverPath(loc);
  const name = locName(loc, l);
  const facts = [
    { label: l.t('film.detail.season'), value: l.t(`film.season.${loc.season}`) },
    { label: l.t('film.cost.label'), value: l.t(`film.cost.${loc.costTier}`) },
    { label: l.t('film.access.label'), value: l.t(`film.access.${loc.accessLevel}`) },
    { label: l.fr ? 'Ville' : 'City', value: locCity(loc, l) },
    { label: l.fr ? 'Région' : 'Region', value: regionName(loc, l) },
    {
      label: l.fr ? 'Coordonnées GPS' : 'GPS coordinates',
      value: `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`,
      href: mapsUrl(loc),
    },
  ];
  const steps = FILM_PROCEDURE_STEPS.filter((st) =>
    st.id === 'parks' ? loc.looks.some((x) => ['forest', 'savanna', 'lake'].includes(x)) : true,
  ).slice(0, 4);

  return (
    <Page size="A4" style={s.page}>
      <Tricolor />
      <Header
        l={l}
        docType={l.fr ? 'Dossier lieu de tournage' : 'Filming location dossier'}
        reference={reference}
        date={date}
      />

      <View style={[s.hero, ...(cover ? [] : [s.heroFallback])]}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
        {cover ? <Image src={cover} style={s.heroImg} /> : null}
        <View style={s.heroBand}>
          <Text style={s.heroTitle}>{name}</Text>
          <Text style={s.heroSub}>
            {locCity(loc, l)} · {regionName(loc, l)} · {l.fr ? 'Cameroun' : 'Cameroon'}
          </Text>
        </View>
      </View>

      <View style={s.pills}>
        {looksOf(loc, l).map((look) => (
          <Text key={look} style={s.pill}>
            {look}
          </Text>
        ))}
        {loc.alsoTourism ? (
          <Text style={[s.pill, s.pillTourism]}>
            {l.fr ? 'Aussi destination touristique' : 'Also a tourist destination'}
          </Text>
        ) : null}
      </View>

      <View style={s.facts}>
        {facts.map((f, i) => (
          <Fact key={f.label} index={i} {...f} />
        ))}
      </View>

      <Text style={s.sectionTitle}>{l.fr ? 'Fiche technique du lieu' : 'Location technical sheet'}</Text>
      <View style={s.grid2}>
        <InfoCard title={l.t('film.detail.access')} body={l.fr ? loc.accessFr : loc.accessEn} color={C.green} />
        <InfoCard title={l.t('film.detail.power')} body={l.fr ? loc.powerFr : loc.powerEn} color={C.gold} />
        <InfoCard title={l.t('film.detail.permit')} body={l.fr ? loc.permitFr : loc.permitEn} color={C.red} />
        <InfoCard
          title={l.fr ? 'Notes pratiques' : 'Practical notes'}
          body={l.fr ? loc.practicalFr : loc.practicalEn}
          color={C.greenDeep}
        />
      </View>

      <View style={s.steps} wrap={false}>
        <Text style={[s.sectionTitle, { marginBottom: 7 }]}>
          {l.fr ? 'Démarches recommandées avant tournage' : 'Recommended steps before the shoot'}
        </Text>
        {steps.map((st, i) => (
          <View key={st.id} style={s.stepRow}>
            <View style={s.stepDot}>
              <Text style={s.stepNum}>{i + 1}</Text>
            </View>
            <Text style={s.stepText}>
              <Text style={s.stepTitle}>{l.fr ? st.titleFr : st.titleEn} — </Text>
              {l.fr ? st.bodyFr : st.bodyEn}
            </Text>
          </View>
        ))}
      </View>

      <Footer l={l} />
    </Page>
  );
}

function ComparePage({
  a,
  b,
  l,
  reference,
  date,
}: {
  a: FilmLocationMeta;
  b: FilmLocationMeta;
  l: L;
  reference: string;
  date: string;
}) {
  const rows: { label: string; a: string; b: string }[] = [
    { label: l.fr ? 'Ville / région' : 'City / region', a: `${locCity(a, l)} · ${regionName(a, l)}`, b: `${locCity(b, l)} · ${regionName(b, l)}` },
    { label: l.t('film.detail.season'), a: l.t(`film.season.${a.season}`), b: l.t(`film.season.${b.season}`) },
    { label: l.t('film.cost.label'), a: l.t(`film.cost.${a.costTier}`), b: l.t(`film.cost.${b.costTier}`) },
    { label: l.t('film.access.label'), a: l.t(`film.access.${a.accessLevel}`), b: l.t(`film.access.${b.accessLevel}`) },
    { label: l.t('film.compare.looks'), a: looksOf(a, l).join(', '), b: looksOf(b, l).join(', ') },
    { label: l.t('film.detail.access'), a: l.fr ? a.accessFr : a.accessEn, b: l.fr ? b.accessFr : b.accessEn },
    { label: l.t('film.detail.power'), a: l.fr ? a.powerFr : a.powerEn, b: l.fr ? b.powerFr : b.powerEn },
    { label: l.t('film.detail.permit'), a: l.fr ? a.permitFr : a.permitEn, b: l.fr ? b.permitFr : b.permitEn },
    { label: l.fr ? 'Notes pratiques' : 'Practical notes', a: l.fr ? a.practicalFr : a.practicalEn, b: l.fr ? b.practicalFr : b.practicalEn },
  ];

  return (
    <Page size="A4" style={s.page}>
      <Tricolor />
      <Header
        l={l}
        docType={l.fr ? 'Comparatif de lieux' : 'Location comparison'}
        reference={reference}
        date={date}
      />
      <Text style={s.compareTitle}>
        {locName(a, l)} <Text style={{ color: C.red }}>vs</Text> {locName(b, l)}
      </Text>
      <Text style={s.compareSub}>
        {l.fr
          ? 'Synthèse côte à côte des contraintes pratiques — fiches détaillées en pages suivantes.'
          : 'Side-by-side summary of practical constraints — detailed sheets on the following pages.'}
      </Text>

      <View style={s.duo}>
        {[a, b].map((loc) => {
          const cover = coverPath(loc);
          return (
            <View key={loc.slug} style={s.duoCard}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
              {cover ? <Image src={cover} style={s.duoImg} /> : <View style={[s.duoImg, { backgroundColor: C.greenDeep }]} />}
              <View style={s.duoCaption}>
                <Text style={s.duoName}>{locName(loc, l)}</Text>
                <Text style={s.duoCity}>
                  {locCity(loc, l)} · {regionName(loc, l)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.table}>
        <View style={s.trHead}>
          <Text style={s.thLabel}> </Text>
          <Text style={s.th}>{locName(a, l)}</Text>
          <Text style={s.th}>{locName(b, l)}</Text>
        </View>
        {rows.map((r, i) => (
          <View key={r.label} style={[s.tr, ...(i % 2 ? [s.trZebra] : [])]} wrap={false}>
            <Text style={s.tdLabel}>{r.label}</Text>
            <Text style={s.td}>{r.a}</Text>
            <Text style={s.td}>{r.b}</Text>
          </View>
        ))}
      </View>

      <Footer l={l} />
    </Page>
  );
}

/** One dossier page per location; two distinct locations also get a comparison cover page. */
export async function renderLocationDossierPdf(
  locations: FilmLocationMeta[],
  locale: Locale,
): Promise<Buffer> {
  const l = labels(locale);
  const date = formatDate(locale);
  const reference = docRef(locations.map((x) => x.slug));
  const [a, b] = locations;
  const title =
    locations.length > 1
      ? `${l.fr ? 'Comparatif' : 'Comparison'} — ${locations.map((x) => locName(x, l)).join(' vs ')}`
      : `${l.fr ? 'Dossier lieu' : 'Location dossier'} — ${locName(a, l)}`;

  return renderToBuffer(
    <Document title={title} author="SmartMboa Film" subject={title} creator="SmartMboa Film" producer="SmartMboa Film" language={locale}>
      {a && b ? <ComparePage a={a} b={b} l={l} reference={reference} date={date} /> : null}
      {locations.map((loc) => (
        <LocationPage key={loc.slug} loc={loc} l={l} reference={reference} date={date} />
      ))}
    </Document>,
  );
}
