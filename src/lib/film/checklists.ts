import type { FilmChecklist } from '@/lib/film/types';

export const FILM_CHECKLISTS: FilmChecklist[] = [
  {
    id: 'pre-production',
    titleFr: 'Pré-production',
    titleEn: 'Pre-production',
    summaryFr: 'Avant le premier jour de tournage au Cameroun.',
    summaryEn: 'Before your first shoot day in Cameroon.',
    items: [
      { id: 'pp1', labelFr: 'Synopsis + moodboard partagés', labelEn: 'Shared synopsis + moodboard' },
      { id: 'pp2', labelFr: 'Liste lieux avec GPS et contacts', labelEn: 'Location list with GPS and contacts' },
      { id: 'pp3', labelFr: 'Dossier autorités déposé', labelEn: 'Authority package filed' },
      { id: 'pp4', labelFr: 'Assurances équipe + matériel', labelEn: 'Crew + gear insurance' },
      { id: 'pp5', labelFr: 'Fixer / coordonnateur local confirmé', labelEn: 'Local fixer / coordinator confirmed' },
      { id: 'pp6', labelFr: 'Plan de transport inter-villes', labelEn: 'Intercity transport plan' },
      { id: 'pp7', labelFr: 'Hébergement réservé près des lieux', labelEn: 'Lodging booked near locations' },
      { id: 'pp8', labelFr: 'Budget contingent (carburant, pourboires)', labelEn: 'Contingency budget (fuel, tips)' },
    ],
  },
  {
    id: 'on-set',
    titleFr: 'Jour de tournage',
    titleEn: 'Shoot day',
    summaryFr: 'Sécurité, communauté et technique sur place.',
    summaryEn: 'Safety, community, and tech on location.',
    items: [
      { id: 'os1', labelFr: 'Brief sécurité + points de rassemblement', labelEn: 'Safety brief + muster points' },
      { id: 'os2', labelFr: 'Copies des autorisations sur site', labelEn: 'Permit copies on site' },
      { id: 'os3', labelFr: 'Générateur / batteries chargées', labelEn: 'Generator / batteries charged' },
      { id: 'os4', labelFr: 'Consentements image obtenus', labelEn: 'Image releases obtained' },
      { id: 'os5', labelFr: 'Médias sauvegardés (double copie)', labelEn: 'Media backed up (dual copy)' },
      { id: 'os6', labelFr: 'Remerciements communauté / chefferie', labelEn: 'Community / chiefdom thanks' },
    ],
  },
  {
    id: 'wrap',
    titleFr: 'Fin de production',
    titleEn: 'Wrap',
    summaryFr: 'Clôture administrative et matériel.',
    summaryEn: 'Admin and gear close-out.',
    items: [
      { id: 'w1', labelFr: 'Inventaire matériel complet', labelEn: 'Full gear inventory' },
      { id: 'w2', labelFr: 'Documents douane / réexport prêts', labelEn: 'Customs / re-export docs ready' },
      { id: 'w3', labelFr: 'Paiements prestataires soldés', labelEn: 'Vendor payments settled' },
      { id: 'w4', labelFr: 'Rapport lieux (photos, contacts)', labelEn: 'Location report (photos, contacts)' },
      { id: 'w5', labelFr: 'Archives rushes sécurisées', labelEn: 'Secured rush archives' },
    ],
  },
];

export function checklistToMarkdown(
  checklist: FilmChecklist,
  locale: 'fr' | 'en',
): string {
  const title = locale === 'fr' ? checklist.titleFr : checklist.titleEn;
  const summary = locale === 'fr' ? checklist.summaryFr : checklist.summaryEn;
  const lines = [
    `# ${title}`,
    '',
    summary,
    '',
    ...checklist.items.map((item) => `- [ ] ${locale === 'fr' ? item.labelFr : item.labelEn}`),
    '',
    '— SmartMboa Film Production',
  ];
  return lines.join('\n');
}
