import type { FilmAuthority, FilmGuideCard, FilmProcedureStep } from '@/lib/film/types';

/**
 * Full DCPA / MINAC “Guide de l’usager” text (Direction de la Cinématographie
 * et des Productions Audiovisuelles), organized as dropdown cards.
 */
export const FILM_GUIDE_CARDS: FilmGuideCard[] = [
  {
    id: 'presentation',
    order: 1,
    kickerFr: 'I — Présentation',
    kickerEn: 'I — Presentation',
    headlineFr: 'Présentation',
    headlineEn: 'Presentation',
    blocks: [
      {
        paragraphsFr: [
          'Le Ministère des Arts et de la Culture est l’administration en charge de la mise en œuvre de la politique du Gouvernement en matière de promotion et de développement artistique et culturel. À ce titre, il est chargé entre autres de la promotion de la création artistique et culturelle, de la diffusion des œuvres d’arts, de la promotion des arts du patrimoine cinématographique, du suivi des activités des institutions à caractère culturel et de la gestion des droits d’auteur.',
          'Il regroupe en son sein plusieurs Directions techniques dont la Direction de la Cinématographie et des Productions Audiovisuelles, en abrégé DCPA, chargée de l’élaboration et de la mise en œuvre des stratégies de développement de la cinématographie et des productions audiovisuelles.',
        ],
        paragraphsEn: [
          'The Ministry of Arts and Culture is the administration in charge of implementing Government policy on artistic and cultural promotion and development. As such, it is responsible among other things for promoting artistic and cultural creation, disseminating works of art, promoting cinematographic heritage arts, monitoring cultural institutions, and managing copyright.',
          'It includes several technical Directorates, among them the Directorate of Cinematography and Audiovisual Productions, abbreviated DCPA, responsible for designing and implementing development strategies for cinematography and audiovisual productions.',
        ],
      },
    ],
  },
  {
    id: 'localisation',
    order: 2,
    kickerFr: 'II — Situation géographique de la DCPA',
    kickerEn: 'II — Geographic location of the DCPA',
    headlineFr: 'Situation géographique de la DCPA',
    headlineEn: 'Geographic location of the DCPA',
    blocks: [
      {
        paragraphsFr: [
          'La Direction de la Cinématographie et des Productions Audiovisuelles (DCPA) est située au 2e étage de l’immeuble du Ministère de la Communication (MINCOM), sis à l’Hôtel de Ville.',
        ],
        paragraphsEn: [
          'The Directorate of Cinematography and Audiovisual Productions (DCPA) is located on the 2nd floor of the Ministry of Communication (MINCOM) building, at the Hôtel de Ville.',
        ],
      },
    ],
  },
  {
    id: 'textes',
    order: 3,
    kickerFr: 'III — Cadre administratif et réglementaire',
    kickerEn: 'III — Administrative and regulatory framework',
    headlineFr: 'Cadre administratif et réglementaire',
    headlineEn: 'Administrative and regulatory framework',
    blocks: [
      {
        paragraphsFr: [
          'Les activités cinématographiques sont encadrées par les textes juridiques ci-après :',
        ],
        paragraphsEn: [
          'Cinematographic activities are governed by the following legal texts:',
        ],
        bulletsFr: [
          'Le décret N° 90/1462 du 09 Novembre 1990 fixe les conditions et les modalités d’obtention des autorisations d’exercice de l’activité cinématographique.',
          'La Loi N° 88/017 du 16 décembre 1988 fixe l’orientation de l’activité cinématographique.',
          'La Loi N° 88/013 du 16 décembre 1988 porte institution des droits et taxes affectés au développement de l’Industrie Cinématographique.',
          'Le Décret N° 89/493 du 20 mars 1989 fixe les règles générales d’hygiène, de sécurité et de la police dans les salles de spectacles cinématographiques.',
          'La Loi n° 2015/007 du 20 avril 2021 régissant l’activité audiovisuelle au Cameroun.',
        ],
        bulletsEn: [
          'Decree No. 90/1462 of 9 November 1990 sets the conditions and procedures for obtaining authorisations to practice cinematographic activity.',
          'Law No. 88/017 of 16 December 1988 sets the orientation of cinematographic activity.',
          'Law No. 88/013 of 16 December 1988 establishes rights and taxes allocated to the development of the Cinematographic Industry.',
          'Decree No. 89/493 of 20 March 1989 sets the general rules of hygiene, safety and policing in cinematographic theatres.',
          'Law No. 2015/007 of 20 April 2021 governing audiovisual activity in Cameroon.',
        ],
      },
      {
        titleFr: 'Article 2 de la Loi n° 013/88',
        titleEn: 'Article 2 of Law No. 013/88',
        paragraphsFr: [
          'L’Article 2 de la Loi n° 013/88 stipule que l’activité cinématographique se définit comme la production, la distribution ou l’exploitation des films cinématographiques pour des personnes physiques ou morales titulaires d’une autorisation préalable.',
        ],
        paragraphsEn: [
          'Article 2 of Law No. 013/88 states that cinematographic activity is defined as the production, distribution or exhibition of cinematographic films by natural or legal persons holding a prior authorisation.',
        ],
      },
      {
        titleFr: 'Article 18 du Décret N° 90/1462',
        titleEn: 'Article 18 of Decree No. 90/1462',
        paragraphsFr: [
          'L’Article 18 du Décret N° 90/1462 stipule que : « Aucune œuvre cinématographique, quels qu’en soient le genre et le format, ne peut être mise en circulation au Cameroun en vue de sa représentation en séance publique, à des fins commerciales, éducatives ou culturelles, si elle n’a pas obtenu le visa réglementaire délivré par le Ministre en charge de la cinématographie, après avis obligatoire de la Commission de Contrôle des Films Cinématographiques. »',
        ],
        paragraphsEn: [
          'Article 18 of Decree No. 90/1462 states that: “No cinematographic work, whatever its genre and format, may be put into circulation in Cameroon for public screening for commercial, educational or cultural purposes unless it has obtained the regulatory visa issued by the Minister in charge of cinematography, after the mandatory opinion of the Commission for the Control of Cinematographic Films.”',
        ],
      },
    ],
  },
  {
    id: 'services',
    order: 4,
    kickerFr: 'Produits de la direction',
    kickerEn: 'Directorate products',
    headlineFr: 'Les produits qu’offre la DCPA aux usagers',
    headlineEn: 'Products the DCPA offers to users',
    blocks: [
      {
        bulletsFr: [
          'L’autorisation de Production',
          'L’autorisation de Distribution',
          'L’autorisation d’Exploitation',
          'L’aide à la création cinématographique et audiovisuelle',
          'Les inscriptions aux registres des distributeurs et des exploitants cinématographiques',
          'La location de la salle de cinéma Sita Bella',
        ],
        bulletsEn: [
          'Production authorisation',
          'Distribution authorisation',
          'Exhibition authorisation',
          'Support for cinematographic and audiovisual creation',
          'Registration in the registers of distributors and cinematographic exhibitors',
          'Rental of the Sita Bella cinema hall',
        ],
      },
      {
        paragraphsFr: [
          'L’activité cinématographique en elle-même comprend : la production, la distribution et l’exploitation des films cinématographiques.',
          'Toute production, distribution et exploitation des films cinématographiques, quels qu’en soient le genre et le format, est subordonnée à la délivrance d’une autorisation préalable.',
        ],
        paragraphsEn: [
          'Cinematographic activity itself comprises: the production, distribution and exhibition of cinematographic films.',
          'Any production, distribution and exhibition of cinematographic films, whatever their genre and format, is subject to the issuance of a prior authorisation.',
        ],
      },
    ],
  },
  {
    id: 'production',
    order: 5,
    kickerFr: 'A — La production',
    kickerEn: 'A — Production',
    headlineFr: 'Autorisation de production',
    headlineEn: 'Production authorisation',
    blocks: [
      {
        paragraphsFr: [
          'L’autorisation de production est accordée une seule fois.',
        ],
        paragraphsEn: [
          'The production authorisation is granted only once.',
        ],
      },
      {
        titleFr: 'Les pièces à fournir',
        titleEn: 'Documents to provide',
        bulletsFr: [
          'Une demande timbrée à adresser au Ministre des Arts et de la Culture (dans laquelle on fera mention du titre du film, le format, les lieux de tournage, la date, le nom du laboratoire de traitement du film)',
          'Le budget de production ou les statuts',
          'Un extrait du casier judiciaire du réalisateur',
          'Le NIU du demandeur ou le RCCM s’il s’agit d’une personne morale',
          'Les statuts de la société de production s’il s’agit d’une personne morale',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application addressed to the Minister of Arts and Culture (stating the film title, format, shooting locations, date, and name of the film processing laboratory)',
          'The production budget or the statutes',
          'A criminal record extract of the director',
          'The applicant’s NIU or the RCCM if it is a legal entity',
          'The statutes of the production company if it is a legal entity',
          'A receipt for payment of the fees',
        ],
      },
      {
        titleFr: 'Les modalités',
        titleEn: 'Procedures',
        paragraphsFr: [
          'Le dossier se dépose au Ministère des Arts et de la Culture contre récépissé. Le Ministre dispose d’un délai de soixante (60) jours pour se prononcer.',
        ],
        paragraphsEn: [
          'The file is lodged at the Ministry of Arts and Culture against a receipt. The Minister has sixty (60) days to decide.',
        ],
      },
    ],
  },
  {
    id: 'distribution',
    order: 6,
    kickerFr: 'B — La distribution',
    kickerEn: 'B — Distribution',
    headlineFr: 'Autorisation de distribution',
    headlineEn: 'Distribution authorisation',
    blocks: [
      {
        titleFr: 'Les pièces à fournir',
        titleEn: 'Documents to provide',
        bulletsFr: [
          'Une demande timbrée à adresser au Ministre des Arts et de la Culture',
          'Un extrait du casier judiciaire ou une expédition des statuts s’il s’agit d’une personne morale',
          'Le NIU du demandeur ou le RCCM',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application addressed to the Minister of Arts and Culture',
          'A criminal record extract or a certified copy of the statutes if it is a legal entity',
          'The applicant’s NIU or the RCCM',
          'A receipt for payment of the fees',
        ],
      },
      {
        titleFr: 'Les modalités',
        titleEn: 'Procedures',
        paragraphsFr: [
          'Le dossier se dépose au Ministère des Arts et de la Culture contre récépissé. Le Ministre dispose d’un délai de soixante (60) jours pour se prononcer.',
          'Cette disposition ne s’applique pas aux Représentations Diplomatiques ni aux Institutions Culturelles Publiques accréditées ou installées au Cameroun.',
        ],
        paragraphsEn: [
          'The file is lodged at the Ministry of Arts and Culture against a receipt. The Minister has sixty (60) days to decide.',
          'This provision does not apply to Diplomatic Representations nor to accredited or established Public Cultural Institutions in Cameroon.',
        ],
      },
    ],
  },
  {
    id: 'exploitation-construction',
    order: 7,
    kickerFr: 'C — L’exploitation',
    kickerEn: 'C — Exhibition',
    headlineFr: 'Construction, transformation ou aménagement d’une salle',
    headlineEn: 'Construction, conversion or fitting-out of a theatre',
    blocks: [
      {
        paragraphsFr: [
          'La construction, la transformation ou l’aménagement d’une salle de cinéma par toute personne physique ou morale est accordée par le Gouverneur de Région territorialement compétent, après avis de la Commission Régionale d’Exploitation composée des représentants des diverses Administrations (DRAC, Représentants Départementaux chargés de l’Hygiène, de la Construction, de l’Architecture, des Établissements dangereux).',
        ],
        paragraphsEn: [
          'The construction, conversion or fitting-out of a cinema theatre by any natural or legal person is granted by the territorially competent Regional Governor, after the opinion of the Regional Exhibition Commission composed of representatives of the various Administrations (DRAC, Departmental Representatives in charge of Hygiene, Construction, Architecture, Dangerous Establishments).',
        ],
        bulletsFr: [
          '01 Représentant de l’Ordre National des Architectes',
          '01 Représentant de l’Organisation Professionnelle des Exploitants des salles de Cinéma',
          '01 copie du document d’accord est déposée au MINAC dans un délai de 10 jours',
          'L’autorisation de construire est valable pour deux (02) ans ; elle est personnelle et incessible',
        ],
        bulletsEn: [
          '01 Representative of the National Order of Architects',
          '01 Representative of the Professional Organisation of Cinema Theatre Exhibitors',
          '01 copy of the agreement document is filed with MINAC within 10 days',
          'The building authorisation is valid for two (02) years; it is personal and non-transferable',
        ],
      },
      {
        titleFr: 'L’autorisation de construction est subordonnée à la production d’un dossier comprenant',
        titleEn: 'The building authorisation requires a file comprising',
        bulletsFr: [
          '01 demande timbrée',
          '01 Extrait du Casier Judiciaire',
          '01 copie de la CNI ou permis de conduire en cours de validité',
          'Le NIU du demandeur',
          '01 attestation du droit de propriété du terrain avec mention du N° du Titre Foncier, le cas échéant, copie du Contrat de Bail',
          '01 autorisation de bâtir délivrée par la Municipalité des Céans',
          '01 jeu complet des plans de la construction signés par un architecte agréé par l’Ordre',
          '01 devis descriptif et estimatif de la construction envisagée',
        ],
        bulletsEn: [
          '01 stamped application',
          '01 Criminal Record extract',
          '01 copy of national ID or a valid driving licence',
          'The applicant’s NIU',
          '01 certificate of land ownership stating the Land Title number, or where applicable a copy of the Lease Contract',
          '01 building permit issued by the local Municipality',
          '01 complete set of construction plans signed by an architect approved by the Order',
          '01 descriptive and estimated quote for the planned construction',
        ],
      },
      {
        titleFr: 'Dépôt',
        titleEn: 'Filing',
        paragraphsFr: [
          'Le dossier est déposé en six (06) exemplaires à la DRAC contre récépissé.',
        ],
        paragraphsEn: [
          'The file is lodged in six (06) copies at the DRAC against a receipt.',
        ],
      },
    ],
  },
  {
    id: 'exploitation-ambulante',
    order: 8,
    kickerFr: 'C — L’exploitation',
    kickerEn: 'C — Exhibition',
    headlineFr: 'L’exploitation ambulante',
    headlineEn: 'Mobile exhibition',
    blocks: [
      {
        paragraphsFr: [
          'Valable pour la seule région concernée, elle est accordée par le délégué régional du Ministère chargé de la cinématographie.',
        ],
        paragraphsEn: [
          'Valid only for the region concerned, it is granted by the regional delegate of the Ministry in charge of cinematography.',
        ],
      },
      {
        titleFr: 'Les pièces à fournir — personnes physiques',
        titleEn: 'Documents to provide — natural persons',
        bulletsFr: [
          'Une demande timbrée',
          'Une copie de la CNI',
          'Un extrait du casier judiciaire',
          'Une note descriptive des appareils et matériels d’exploitation',
          'Le NIU du demandeur',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application',
          'A copy of the national ID',
          'A criminal record extract',
          'A descriptive note of the exhibition equipment and apparatus',
          'The applicant’s NIU',
          'A receipt for payment of the fees',
        ],
      },
      {
        titleFr: 'Les pièces à fournir — personnes morales',
        titleEn: 'Documents to provide — legal entities',
        bulletsFr: [
          'Une demande timbrée',
          '01 copie de la CNI',
          'Les statuts de la société',
          'Extrait de Casier Judiciaire du directeur d’exploitation ou du gérant',
          'Le RCCM',
          'Une note descriptive des appareils et matériels d’exploitation',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application',
          '01 copy of the national ID',
          'The company statutes',
          'Criminal Record extract of the exhibition director or manager',
          'The RCCM',
          'A descriptive note of the exhibition equipment and apparatus',
          'A receipt for payment of the fees',
        ],
      },
      {
        titleFr: 'Les modalités',
        titleEn: 'Procedures',
        paragraphsFr: [
          'Le dossier est déposé à la DRAC, qui a 30 jours pour se prononcer.',
        ],
        paragraphsEn: [
          'The file is lodged at the DRAC, which has 30 days to decide.',
        ],
      },
    ],
  },
  {
    id: 'exploitation-videogrammes',
    order: 9,
    kickerFr: 'C — L’exploitation',
    kickerEn: 'C — Exhibition',
    headlineFr: 'L’exploitation des vidéogrammes',
    headlineEn: 'Videogram exhibition',
    blocks: [
      {
        titleFr: 'Les pièces à fournir',
        titleEn: 'Documents to provide',
        bulletsFr: [
          'Une demande timbrée',
          '01 copie de la CNI',
          'Le RCCM pour une personne morale',
          'Un extrait du casier judiciaire du directeur d’exploitation ou du gérant',
          'Les statuts de la société, s’il s’agit d’une personne morale',
          'Le NIU du demandeur s’il s’agit d’une personne morale',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application',
          '01 copy of the national ID',
          'The RCCM for a legal entity',
          'A criminal record extract of the exhibition director or manager',
          'The company statutes, if it is a legal entity',
          'The applicant’s NIU if it is a legal entity',
          'A receipt for payment of the fees',
        ],
      },
    ],
  },
  {
    id: 'prises-de-vues',
    order: 10,
    kickerFr: 'Tournage',
    kickerEn: 'Filming',
    headlineFr: 'Autorisation de prises de vues',
    headlineEn: 'Filming authorisation',
    blocks: [
      {
        paragraphsFr: [
          'Le décret n° 90/1462 du 09 Novembre 1990 fixe les conditions et les modalités d’obtention des autorisations d’exercice de l’activité cinématographique, et stipule que toute production, distribution et exploitation des films cinématographiques, quels qu’en soient le genre et le format, sont subordonnés à la délivrance d’une autorisation préalable.',
        ],
        paragraphsEn: [
          'Decree No. 90/1462 of 9 November 1990 sets the conditions and procedures for obtaining authorisations to practice cinematographic activity, and states that any production, distribution and exhibition of cinematographic films, whatever their genre and format, are subject to the issuance of a prior authorisation.',
        ],
      },
      {
        titleFr: 'Les pièces à fournir',
        titleEn: 'Documents to provide',
        bulletsFr: [
          'Une demande timbrée à adresser au Ministre des Arts et de la Culture (dans laquelle on fera mention du titre du film, le format, les lieux de tournage, la date, le nom du laboratoire de traitement du film)',
          '03 exemplaires du scénario',
          'Le ou les contrats des auteurs et du réalisateur',
          'Un extrait du casier judiciaire datant de moins de 3 mois',
          'Un curriculum vitae',
          'Une photocopie certifiée conforme de la CNI',
          '01 autorisation de Production',
          'Les renseignements usuels d’État civil du Directeur de Production et du Réalisateur',
          'Une quittance de paiement des droits',
        ],
        bulletsEn: [
          'A stamped application addressed to the Minister of Arts and Culture (stating the film title, format, shooting locations, date, and name of the film processing laboratory)',
          '03 copies of the screenplay',
          'The author and director contract(s)',
          'A criminal record extract less than 3 months old',
          'A curriculum vitae',
          'A certified true photocopy of the national ID',
          '01 Production authorisation',
          'The usual civil-status details of the Production Director and the Director',
          'A receipt for payment of the fees',
        ],
      },
    ],
  },
  {
    id: 'visa',
    order: 11,
    kickerFr: 'E — Visa d’exploitation de films',
    kickerEn: 'E — Film exhibition visa',
    headlineFr: 'Visa d’exploitation de films',
    headlineEn: 'Film exhibition visa',
    blocks: [
      {
        paragraphsFr: [
          'Aucune œuvre cinématographique, quels qu’en soient le genre et le format, ne peut être mise en circulation au Cameroun en vue de sa représentation en séance publique, à des fins commerciales, éducatives ou culturelles, si elle n’a pas obtenu le visa réglementaire délivré par le Ministre des Arts et de la Culture, après avis de la Commission Nationale de Contrôle des Films Cinématographiques.',
        ],
        paragraphsEn: [
          'No cinematographic work, whatever its genre and format, may be put into circulation in Cameroon for public screening for commercial, educational or cultural purposes unless it has obtained the regulatory visa issued by the Minister of Arts and Culture, after the opinion of the National Commission for the Control of Cinematographic Films.',
        ],
      },
      {
        titleFr: 'Composition du dossier',
        titleEn: 'File contents',
        bulletsFr: [
          'Une demande timbrée adressée au Ministre des Arts et de la Culture',
          '03 exemplaires du scénario et de la fiche technique du film',
          'Les affiches y relatives',
          '01 contrat d’acquisition, de cession ou de concession des droits sur le film avec le producteur ou ses représentants légaux',
          '01 copie du film',
          'Avant toute projection, mention claire des restrictions d’âge telles que portées sur le Visa d’exploitation',
          'Le NIU du demandeur',
          'Une quittance de paiement des droits y relatifs',
        ],
        bulletsEn: [
          'A stamped application addressed to the Minister of Arts and Culture',
          '03 copies of the script and the film’s technical sheet',
          'The related posters',
          '01 contract for acquisition, assignment or concession of rights in the film with the producer or their legal representatives',
          '01 copy of the film',
          'Before any screening, clear mention of the age restrictions as stated on the Exhibition Visa',
          'The applicant’s NIU',
          'A receipt for payment of the related fees',
        ],
      },
      {
        titleFr: 'Les modalités',
        titleEn: 'Procedures',
        paragraphsFr: [
          'Le dossier se dépose au Ministère des Arts et de la Culture contre récépissé. Une Commission Nationale de Contrôle des Films placée sous l’autorité du Ministre siège et donne son avis dans un délai de soixante (60) jours suivant la date de dépôt du dossier.',
        ],
        paragraphsEn: [
          'The file is lodged at the Ministry of Arts and Culture against a receipt. A National Film Control Commission under the authority of the Minister sits and gives its opinion within sixty (60) days of the filing date.',
        ],
      },
    ],
  },
  {
    id: 'droits',
    order: 12,
    kickerFr: 'Tarifs',
    kickerEn: 'Fees',
    headlineFr: 'Les droits de délivrance',
    headlineEn: 'Issuance fees',
    blocks: [
      {
        paragraphsFr: [
          'Article TRENTE-HUIT (dispositions relatives aux recettes non fiscales du secteur des Arts et de la Culture) de la Loi N° 2025/012 du 17 décembre 2025 portant loi de finances de la République du Cameroun pour l’exercice 2026.',
        ],
        paragraphsEn: [
          'Article THIRTY-EIGHT (provisions relating to non-tax revenues of the Arts and Culture sector) of Law No. 2025/012 of 17 December 2025 on the Finance Law of the Republic of Cameroon for the 2026 financial year.',
        ],
      },
      {
        titleFr: 'Droits sur la production (selon le coût de production)',
        titleEn: 'Production rights (according to production cost)',
        bulletsFr: [
          'Films dont le coût de production est inférieur à 100 millions de francs : 0,5 % de ce coût',
          'Films dont le coût de production est supérieur à 100 millions de francs et inférieur ou égal à 250 millions : 0,75 % de ce coût',
          'Films dont le coût de production est supérieur à 250 millions de francs : 1 % de ce coût',
        ],
        bulletsEn: [
          'Films with a production cost under 100 million francs: 0.5% of that cost',
          'Films with a production cost over 100 million francs and less than or equal to 250 million: 0.75% of that cost',
          'Films with a production cost over 250 million francs: 1% of that cost',
        ],
      },
      {
        titleFr: 'Autorisations et visas',
        titleEn: 'Authorisations and visas',
        bulletsFr: [
          'Autorisation de prises de vues : 20 000 FCFA / film',
          'Visa d’exploitation — films nationaux de moins de 60 min (courts métrages) : 5 000 FCFA',
          'Visa d’exploitation — films nationaux de plus de 60 min (longs métrages) : 10 000 FCFA',
          'Visa d’exploitation — films étrangers de moins de 60 min (courts métrages) : 15 000 FCFA',
          'Visa d’exploitation — films étrangers de plus de 60 min : 30 000 FCFA',
          'Clips vidéos musicaux nationaux : 10 000 FCFA / œuvre',
          'Clips vidéos musicaux étrangers : 25 000 FCFA / œuvre',
          'Contenus publicitaires à caractère artistique ou culturel (spots ou capsules) : 20 000 FCFA / œuvre',
        ],
        bulletsEn: [
          'Shooting authorisation: 20,000 FCFA / film',
          'Exhibition visa — national films under 60 min (short films): 5,000 FCFA',
          'Exhibition visa — national films over 60 min (feature films): 10,000 FCFA',
          'Exhibition visa — foreign films under 60 min (short films): 15,000 FCFA',
          'Exhibition visa — foreign films over 60 min: 30,000 FCFA',
          'National music video clips: 10,000 FCFA / work',
          'Foreign music video clips: 25,000 FCFA / work',
          'Advertising content of an artistic or cultural nature (spots or capsules): 20,000 FCFA / work',
        ],
      },
    ],
  },
  {
    id: 'sanctions',
    order: 13,
    kickerFr: 'Contrôle',
    kickerEn: 'Enforcement',
    headlineFr: 'Les sanctions applicables',
    headlineEn: 'Applicable sanctions',
    blocks: [
      {
        titleFr: 'Infractions et montants des amendes',
        titleEn: 'Offences and fine amounts',
        bulletsFr: [
          'Exercice sans autorisation préalable : 100 000 FCFA',
          'Distribution non autorisée de films : 200 000 FCFA',
          'Exploitation non conforme (salles fixes, vidéoclubs, rue, occasionnelle) : 150 000 FCFA',
          'Défaut de souscription d’assurance (incendie, dommages corporels et dommages matériels) : 500 000 FCFA',
        ],
        bulletsEn: [
          'Practice without prior authorisation: 100,000 FCFA',
          'Unauthorised distribution of films: 200,000 FCFA',
          'Non-compliant exhibition (fixed theatres, video clubs, street, occasional): 150,000 FCFA',
          'Failure to take out insurance (fire, bodily injury and material damage): 500,000 FCFA',
        ],
      },
      {
        titleFr: 'Circulation et projection en séance publique',
        titleEn: 'Circulation and projection in a public session',
        paragraphsFr: [
          'Quiconque met en circulation, projette ou fait projeter dans un lieu public en séance publique, ou met à la disposition du public :',
        ],
        paragraphsEn: [
          'Anyone who puts into circulation, projects or causes to be projected in a public place during a public session, or makes available to the public:',
        ],
        bulletsFr: [
          'Des films interdits',
          'Des films sans autorisation réglementaire',
          'Des films interdits aux moins de treize (13) ans, ou tout au moins aux moins de dix-huit (18) ans, lorsque ces mineurs ont été admis dans la salle',
          'Une ou plusieurs parties censurées d’un film',
        ],
        bulletsEn: [
          'Prohibited films',
          'Films without regulatory authorisation',
          'Films forbidden to persons under thirteen (13) years of age, or at least under eighteen (18) years of age, when such minors have been admitted to the theatre',
          'One or more censored parts of a film',
        ],
      },
      {
        titleFr: 'Peine',
        titleEn: 'Penalty',
        paragraphsFr: [
          'Amende de quatre cent mille (400 000) à un million (1 000 000) de francs.',
        ],
        paragraphsEn: [
          'Fine of four hundred thousand (400,000) to one million (1,000,000) francs.',
        ],
      },
      {
        titleFr: 'Paiement',
        titleEn: 'Payment',
        paragraphsFr: [
          'Les amendes sont payées au Trésor public dans un délai de trois (03) mois à compter de la notification. À défaut, les procédures de recouvrement forcé sont engagées.',
        ],
        paragraphsEn: [
          'Fines are paid to the Public Treasury within three (03) months of notification. Failing that, forced recovery procedures are initiated.',
        ],
      },
    ],
  },
];

/** Compact next-steps still used by location dossier PDFs. */
export const FILM_PROCEDURE_STEPS: FilmProcedureStep[] = [
  {
    id: 'production',
    order: 1,
    titleFr: 'Autorisation de production',
    titleEn: 'Production authorisation',
    bodyFr:
      'Dossier MINAC / DCPA (demande timbrée, NIU/RCCM, casier, budget/statuts, quittance). Décision sous 60 jours.',
    bodyEn:
      'MINAC / DCPA file (stamped application, NIU/RCCM, criminal record, budget/statutes, fee receipt). Decision within 60 days.',
  },
  {
    id: 'prises-de-vues',
    order: 2,
    titleFr: 'Autorisation de prises de vues',
    titleEn: 'Filming authorisation',
    bodyFr:
      'Scénario (×3), contrats, casier < 3 mois, CNI, autorisation de production et quittance — avant le tournage.',
    bodyEn:
      'Script (×3), contracts, criminal record < 3 months, ID, production authorisation and fee receipt — before filming.',
  },
  {
    id: 'visa',
    order: 3,
    titleFr: 'Visa d’exploitation',
    titleEn: 'Exhibition visa',
    bodyFr:
      'Pour toute projection publique : scénario, fiche technique, contrat de droits, copie du film, NIU et quittance. Avis sous 60 jours.',
    bodyEn:
      'For any public screening: script, technical sheet, rights contract, film copy, NIU and fee receipt. Opinion within 60 days.',
  },
  {
    id: 'local',
    order: 4,
    titleFr: 'Autorités locales',
    titleEn: 'Local authorities',
    bodyFr:
      'Préfecture, mairie, police et chefferie selon les lieux. Un fixer local accélère les accords de terrain.',
    bodyEn:
      'Prefecture, city hall, police and chiefdom depending on the locations. A local fixer speeds on-the-ground clearances.',
  },
  {
    id: 'parks',
    order: 5,
    titleFr: 'Parcs et sites protégés',
    titleEn: 'Parks and protected sites',
    bodyFr:
      'MINFOF et gestionnaires de parc (Waza, Dja, Korup…) : délais, guide escorté possible, règles strictes drones et faune.',
    bodyEn:
      'MINFOF and park managers (Waza, Dja, Korup…): lead time, possible escorted guide, strict drone and wildlife rules.',
  },
];

export const FILM_AUTHORITIES: FilmAuthority[] = [
  {
    id: 'dcpa',
    nameFr: 'DCPA — Direction de la Cinématographie et des Productions Audiovisuelles',
    nameEn: 'DCPA — Directorate of Cinematography and Audiovisual Productions',
    roleFr:
      'Autorisations de production, distribution, exploitation et prises de vues ; visa d’exploitation ; aide à la création ; registres ; salle Sita Bella.',
    roleEn:
      'Production, distribution, exhibition and filming authorisations; exhibition visa; creation support; registers; Sita Bella hall.',
    cityFr: 'Yaoundé — 2e étage, immeuble MINCOM (Hôtel de Ville)',
    cityEn: 'Yaoundé — 2nd floor, MINCOM building (Hôtel de Ville)',
    contactHintFr: 'Dépôt de dossier au Ministère des Arts et de la Culture contre récépissé.',
    contactHintEn: 'File at the Ministry of Arts and Culture against a receipt.',
  },
  {
    id: 'minaculture',
    nameFr: 'Ministère des Arts et de la Culture',
    nameEn: 'Ministry of Arts and Culture',
    roleFr: 'Tutelle ; décision ministérielle sous 60 jours sur les autorisations et le visa.',
    roleEn: 'Oversight; ministerial decision within 60 days on authorisations and the visa.',
    cityFr: 'Yaoundé',
    cityEn: 'Yaoundé',
    contactHintFr: 'Adressez les demandes timbrées au Ministre des Arts et de la Culture.',
    contactHintEn: 'Address stamped applications to the Minister of Arts and Culture.',
  },
  {
    id: 'commission',
    nameFr: 'Commission Nationale de Contrôle des Films Cinématographiques',
    nameEn: 'National Commission for the Control of Cinematographic Films',
    roleFr: 'Avis obligatoire avant délivrance du visa d’exploitation (délai 60 jours).',
    roleEn: 'Mandatory opinion before issuance of the exhibition visa (60-day deadline).',
    cityFr: 'Yaoundé — sous l’autorité du Ministre',
    cityEn: 'Yaoundé — under the Minister’s authority',
    contactHintFr: 'Saisine via le dépôt du dossier de visa au Ministère.',
    contactHintEn: 'Seized via lodging of the visa file at the Ministry.',
  },
  {
    id: 'drac',
    nameFr: 'DRAC — Délégations régionales des Arts et de la Culture',
    nameEn: 'DRAC — Regional Arts and Culture Delegations',
    roleFr:
      'Dépôt des dossiers de construction / transformation de salles (06 exemplaires) et d’exploitation ambulante (avis sous 30 jours).',
    roleEn:
      'Filing of theatre construction / conversion dossiers (06 copies) and mobile exhibition (decision within 30 days).',
    cityFr: 'Chef-lieu de région',
    cityEn: 'Regional capital',
    contactHintFr: 'Commission régionale puis autorisation du Gouverneur pour les salles.',
    contactHintEn: 'Regional commission then Governor authorisation for theatres.',
  },
];
