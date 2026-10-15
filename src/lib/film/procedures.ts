import type { FilmAuthority, FilmProcedureStep } from '@/lib/film/types';

export const FILM_PROCEDURE_STEPS: FilmProcedureStep[] = [
  {
    id: 'concept',
    order: 1,
    titleFr: 'Dossier de production',
    titleEn: 'Production package',
    bodyFr:
      'Préparez synopsis, planning, liste des lieux, effectifs, besoins en drone/animaux, et budget indicatif. Un dossier clair accélère chaque autorisation.',
    bodyEn:
      'Prepare synopsis, schedule, location list, crew size, drone/animal needs, and an indicative budget. A clear package speeds every permit.',
  },
  {
    id: 'ministry',
    order: 2,
    titleFr: 'Ministères et tutelles',
    titleEn: 'Ministries and oversight',
    bodyFr:
      'Selon le projet : Ministère des Arts et de la Culture, communication, ou tutelles sectorielles. Les tournages institutionnels passent souvent par des services centraux à Yaoundé.',
    bodyEn:
      'Depending on the project: Ministry of Arts and Culture, communications, or sector oversight. Institutional shoots often go through Yaoundé central services.',
  },
  {
    id: 'local',
    order: 3,
    titleFr: 'Autorités locales',
    titleEn: 'Local authorities',
    bodyFr:
      'Préfecture, mairie, police et, en zone traditionnelle, chefferie. Chaque région a ses usages — un fixer local reste le meilleur accélérateur.',
    bodyEn:
      'Prefecture, city hall, police, and in traditional areas the chiefdom. Each region has its customs — a local fixer remains the best accelerator.',
  },
  {
    id: 'parks',
    order: 4,
    titleFr: 'Parcs et sites protégés',
    titleEn: 'Parks and protected sites',
    bodyFr:
      'MINFOF et gestionnaires de parc (Waza, Dja, Korup…) exigent des délais, parfois un guide escorté et des règles strictes sur drones et faune.',
    bodyEn:
      'MINFOF and park managers (Waza, Dja, Korup…) require lead time, sometimes escorted guides, and strict rules on drones and wildlife.',
  },
  {
    id: 'customs',
    order: 5,
    titleFr: 'Matériel et douanes',
    titleEn: 'Gear and customs',
    bodyFr:
      'Pour matériel importé temporairement : carnet ATA / listing détaillé, assurance, et plan de réexportation. Anticipez les contrôles aéroportuaires.',
    bodyEn:
      'For temporarily imported gear: ATA carnet / detailed inventory, insurance, and re-export plan. Anticipate airport checks.',
  },
  {
    id: 'community',
    order: 6,
    titleFr: 'Communautés et consentement',
    titleEn: 'Communities and consent',
    bodyFr:
      'Informez villages et marchés avant le jour J. Rémunération figurants, respect des rites et des interdits photographiques font partie de la production responsable.',
    bodyEn:
      'Brief villages and markets before shoot day. Extra fees, respect for rites and photo taboos are part of responsible production.',
  },
];

export const FILM_AUTHORITIES: FilmAuthority[] = [
  {
    id: 'minaculture',
    nameFr: 'Ministère des Arts et de la Culture',
    nameEn: 'Ministry of Arts and Culture',
    roleFr: 'Cadre culturel, festivals, accompagnement sectoriel.',
    roleEn: 'Cultural framework, festivals, sector support.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    contactHintFr: 'Passer par le service compétent cinéma / audiovisuel.',
    contactHintEn: 'Go through the cinema / audiovisual desk.',
  },
  {
    id: 'minfof',
    nameFr: 'MINFOF — Forêts et Faune',
    nameEn: 'MINFOF — Forests and Wildlife',
    roleFr: 'Autorisations parcs nationaux et réserves.',
    roleEn: 'National park and reserve permits.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    contactHintFr: 'Dossier + dates + zones exactes de tournage.',
    contactHintEn: 'Package + dates + exact shoot zones.',
  },
  {
    id: 'tourism',
    nameFr: 'Ministère du Tourisme et des Loisirs',
    nameEn: 'Ministry of Tourism and Leisure',
    roleFr: 'Sites touristiques, valorisation destination.',
    roleEn: 'Tourist sites, destination promotion.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    contactHintFr: 'Utile quand le lieu est aussi produit touristique.',
    contactHintEn: 'Useful when the site is also a tourism product.',
  },
  {
    id: 'douala-city',
    nameFr: 'Communauté urbaine de Douala',
    nameEn: 'Douala City Council',
    roleFr: 'Occupation voirie, plages urbaines, events.',
    roleEn: 'Street occupation, urban beaches, events.',
    cityFr: 'Douala',
    cityEn: 'Douala',
    contactHintFr: 'Demande écrite + plan de sécurité.',
    contactHintEn: 'Written request + safety plan.',
  },
  {
    id: 'yaounde-city',
    nameFr: 'Communauté urbaine de Yaoundé',
    nameEn: 'Yaoundé City Council',
    roleFr: 'Espaces publics, monuments, circulation.',
    roleEn: 'Public spaces, monuments, traffic.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    contactHintFr: 'Coordonner police municipale si besoin.',
    contactHintEn: 'Coordinate municipal police if needed.',
  },
];
