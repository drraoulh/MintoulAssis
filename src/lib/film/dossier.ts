import type { FilmLocationMeta } from '@/lib/film/types';
import { FILM_LOOKS } from '@/lib/film/locations';
import { REGIONS } from '@/lib/regions';

/** Build a preliminary location dossier as Markdown for producers. */
export function locationDossierMarkdown(
  loc: FilmLocationMeta,
  locale: 'fr' | 'en',
): string {
  const name = locale === 'fr' ? loc.nameFr : loc.nameEn;
  const city = locale === 'fr' ? loc.cityFr : loc.cityEn;
  const region = REGIONS.find((r) => r.id === loc.regionId);
  const regionName = region
    ? locale === 'fr'
      ? region.nameFr
      : region.nameEn
    : loc.regionId;
  const looks = loc.looks
    .map((id) => {
      const m = FILM_LOOKS.find((x) => x.id === id);
      return locale === 'fr' ? m?.fr : m?.en;
    })
    .filter(Boolean)
    .join(', ');

  const lines =
    locale === 'fr'
      ? [
          `# Dossier lieu — ${name}`,
          '',
          `**SmartMboa Film Production** · dossier préliminaire`,
          '',
          `## Identification`,
          `- Lieu : ${name}`,
          `- Ville : ${city}`,
          `- Région : ${regionName}`,
          `- Ambiances : ${looks}`,
          `- Saison indicative : ${loc.season}`,
          `- GPS : ${loc.latitude}, ${loc.longitude}`,
          `- Coût relatif (prod locale) : ${loc.costTier}`,
          `- Accessibilité : ${loc.accessLevel}`,
          '',
          `## Accès`,
          loc.accessFr,
          '',
          `## Énergie`,
          loc.powerFr,
          '',
          `## Autorisations`,
          loc.permitFr,
          '',
          `## Notes pratiques`,
          loc.practicalFr,
          '',
          loc.alsoTourism
            ? `## Lien tourisme\nCe site est aussi une destination touristique SmartMboa (${loc.tourismHref ?? `/destinations/${loc.placeId}`}).`
            : '',
          '',
          `---`,
          `Document généré pour partage producteurs. Vérifier sur place avant engagement.`,
          `© SmartMboa`,
        ]
      : [
          `# Location dossier — ${name}`,
          '',
          `**SmartMboa Film Production** · preliminary dossier`,
          '',
          `## Identification`,
          `- Location: ${name}`,
          `- City: ${city}`,
          `- Region: ${regionName}`,
          `- Looks: ${looks}`,
          `- Indicative season: ${loc.season}`,
          `- GPS: ${loc.latitude}, ${loc.longitude}`,
          `- Relative cost (local unit): ${loc.costTier}`,
          `- Accessibility: ${loc.accessLevel}`,
          '',
          `## Access`,
          loc.accessEn,
          '',
          `## Power`,
          loc.powerEn,
          '',
          `## Permits`,
          loc.permitEn,
          '',
          `## Practical notes`,
          loc.practicalEn,
          '',
          loc.alsoTourism
            ? `## Tourism link\nThis site is also a SmartMboa tourist destination (${loc.tourismHref ?? `/destinations/${loc.placeId}`}).`
            : '',
          '',
          `---`,
          `Generated for producer sharing. Verify on site before commitment.`,
          `© SmartMboa`,
        ];

  return lines.filter((l) => l !== undefined).join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
