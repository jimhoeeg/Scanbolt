/**
 * Viden-modul — vidensdeling om sliddele.
 *
 * Ren data (ingen 'use client'), så den kan bruges af server-komponenter og
 * indekseres. Indholdet er på dansk og deler ud af fagviden om slid, levetid
 * og vedligehold — præcis den ekspertise en professionel maskinejer/forhandler
 * efterspørger. Vises som faktabokse rundt i sitet og som artikler under /viden.
 */

export interface FactItem {
  /** Kort overskrift på pointen, fx "Tegn på slid". */
  label: string;
  /** Uddybende tekst. */
  text: string;
}

export interface KnowledgeArticle {
  slug: string;
  category: 'Undervogn' | 'Gummibælter' | 'Bæltemotor' | 'Vedligehold';
  icon: string; // emoji-ikon (holder det statisk og assetfrit)
  title: string;
  /** Kort teaser til kort/lister. */
  summary: string;
  /** "Vidste du?"-pointe der kan vises som kompakt faktaboks. */
  keyFact: string;
  /** Uddybende faktapunkter til artikelsiden. */
  facts: FactItem[];
  /** Konkrete tegn på slid, man selv kan tjekke. */
  wearSigns: string[];
  /** Praktiske råd fra værkstedet. */
  tips: string[];
}

export const KNOWLEDGE: KnowledgeArticle[] = [
  {
    slug: 'gummibaelter-levetid-og-slid',
    category: 'Gummibælter',
    icon: '🛞',
    title: 'Gummibælter: levetid, slid og hvornår de skal skiftes',
    summary:
      'Sådan aflæser du slitagen på dine gummibælter og får maksimal levetid ud af dem.',
    keyFact:
      'Et gummibælte holder typisk 1.200–2.000 driftstimer — men forkert bæltespænding kan halvere levetiden.',
    facts: [
      {
        label: 'Levetid',
        text: 'Under normale forhold holder et kvalitetsgummibælte 1.200–2.000 timer. Kørsel på asfalt, skarpt skærvegrus og sving på stedet slider markant hurtigere.',
      },
      {
        label: 'Bæltespænding er afgørende',
        text: 'For stram spænding overbelaster bæltemotor og ruller; for løs spænding får bæltet til at "hoppe af" pignonen. Følg altid maskinproducentens mål for nedbøjning.',
      },
      {
        label: 'Stålkordens tilstand',
        text: 'Indvendige stålkorder giver bæltet dets styrke. Er de blotlagte eller rustne, er bæltet ved vejs ende — uanset hvor meget mønster der er tilbage.',
      },
    ],
    wearSigns: [
      'Mønsterdybde under 5 mm på klodserne',
      'Revner i gummiet ved bæltets kant eller mellem klodser',
      'Blotlagte eller sprungne stålkorder',
      'Manglende eller nedslidte styreklodser på indersiden',
    ],
    tips: [
      'Tjek bæltespændingen hver 250. time og efter arbejde i mudder/ler.',
      'Undgå unødige sving på stedet på hårdt underlag.',
      'Rens for sten og ler mellem bælte og undervogn efter endt arbejdsdag.',
    ],
  },
  {
    slug: 'undervogn-slidkomponenter',
    category: 'Undervogn',
    icon: '⚙️',
    title: 'Undervognen: ruller, pignon og styring',
    summary:
      'Undervognen står for op til 50 % af en bæltemaskines vedligeholdsomkostninger. Kend slidkomponenterne.',
    keyFact:
      'Undervognen kan udgøre op til 50 % af de samlede vedligeholdsomkostninger på en bæltemaskine.',
    facts: [
      {
        label: 'Slid hænger sammen',
        text: 'Bærruller, styreruller, pignon og bælte slider som ét system. En slidt pignon æder et nyt bælte op — skift derfor altid slidte drivkomponenter sammen med bæltet.',
      },
      {
        label: 'Rullernes tætninger',
        text: 'Ruller er oliefyldte og forseglede. Ses der olie på siden af en rulle, er tætningen defekt, og rullen kører tør og ødelægges hurtigt.',
      },
      {
        label: 'Symmetrisk slid',
        text: 'Kør maskinen skiftevis i begge retninger, så slidet fordeles jævnt på pignon og ruller.',
      },
    ],
    wearSigns: [
      'Hyletone eller knasen fra undervognen under kørsel',
      'Olieudslip på siden af bær- eller styreruller',
      'Skarpe, "hajfinne"-formede tænder på pignonen',
      'Bæltet vandrer sidelæns eller hopper af',
    ],
    tips: [
      'Spul undervognen ren dagligt — ophobet materiale er den største slidfaktor.',
      'Mål rullehøjde og pignontænder ved hvert større serviceeftersyn.',
      'Skift slidte drivkomponenter samtidig med bæltet.',
    ],
  },
  {
    slug: 'baeltemotor-final-drive-vedligehold',
    category: 'Bæltemotor',
    icon: '🔧',
    title: 'Bæltemotor (final drive): olie, slid og havari',
    summary:
      'Bæltemotoren er dyr at skifte — men billig at holde ved lige. Sådan forlænger du levetiden.',
    keyFact:
      'Regelmæssigt olieskift i bæltemotoren er den billigste forsikring mod et havari til titusindvis af kroner.',
    facts: [
      {
        label: 'Olie er alt',
        text: 'Bæltemotorens planetgear kører i oliebad. For lidt eller nedbrudt olie giver metal-mod-metal-slid, der hurtigt ødelægger gearsættet.',
      },
      {
        label: 'Olieskift-interval',
        text: 'Skift gearolien efter de første 250 timer (indkøring) og derefter typisk hver 1.000. time — se maskinens servicemanual.',
      },
      {
        label: 'Aflæs olien',
        text: 'Metalspåner i olien = internt slid. Mælkeagtig olie = vand er trængt ind gennem en defekt tætning.',
      },
    ],
    wearSigns: [
      'Metalliske spåner på aftapningsproppens magnet',
      'Mælkeagtig eller misfarvet gearolie',
      'Hyle-, brum- eller knasetone der følger kørehastigheden',
      'Nedsat trækkraft eller "ryk" i den ene side',
    ],
    tips: [
      'Tjek oliestand ved hvert dagligt eftersyn.',
      'Overhold indkøringsolieskiftet efter 250 timer.',
      'Reager straks på metalspåner — tidlig reparation er langt billigere end nyt gearsæt.',
    ],
  },
  {
    slug: 'daglig-vedligehold-checkliste',
    category: 'Vedligehold',
    icon: '📋',
    title: 'Daglig vedligehold: din 5-minutters checkliste',
    summary:
      'Fem minutter om dagen forebygger langt de dyreste nedbrud på sliddelene.',
    keyFact:
      'Op mod 70 % af uplanlagte nedbrud på undervogn og bæltemotor kan forebygges med simpelt dagligt eftersyn.',
    facts: [
      {
        label: 'Rengøring',
        text: 'Fjern ler, sten og snavs fra undervogn og bælter. Ophobet materiale er den enkeltfaktor der slider mest.',
      },
      {
        label: 'Væsker',
        text: 'Kontrollér oliestand i bæltemotorer og for utætheder ved ruller og slanger.',
      },
      {
        label: 'Visuel kontrol',
        text: 'Se efter revner, blotlagte stålkorder og løse bolte. Små fejl fanget tidligt bliver aldrig til store regninger.',
      },
    ],
    wearSigns: [
      'Nye oliepletter under maskinen om morgenen',
      'Løse eller manglende bolte på undervogn',
      'Unormale lyde ved opstart',
    ],
    tips: [
      'Lav en fast rutine før første opstart hver dag.',
      'Noter timetal ved hvert olieskift — så rammer du intervallerne.',
      'Hav de kritiske sliddele på lager, så nedetid minimeres.',
    ],
  },
];

export function getArticle(slug: string): KnowledgeArticle | undefined {
  return KNOWLEDGE.find((a) => a.slug === slug);
}
