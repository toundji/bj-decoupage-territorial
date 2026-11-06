/**
 * Prépare public/ pour le référencement, à partir de public/data/decoupage.json
 * (aucune base ni dépendance requise) :
 *   - contenu statique indexable dans index.html (présentation, questions
 *     fréquentes, départements → communes → arrondissements) ;
 *   - données structurées schema.org (Dataset, WebSite, FAQPage) ;
 *   - sitemap.xml.
 * Idempotent : remplace ce qui se trouve entre les marqueurs <!-- seo:… -->.
 *
 *   node scripts/build-site.mjs        (ou npm run build:site)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://toundji.github.io/bj-decoupage-territorial/';
const REPO = 'https://github.com/toundji/bj-decoupage-territorial';
const SOURCE = 'https://github.com/nioperas06/bj-decoupage-territorial';
const pub = join(import.meta.dirname, '..', 'public');

const raw = JSON.parse(readFileSync(join(pub, 'data', 'decoupage.json'), 'utf8'));
const table = (name) => raw[name].lignes.map((l) => Object.fromEntries(raw[name].champs.map((c, i) => [c, l[i]])));
const [deps, coms, arrs, locs] = ['departements', 'communes', 'arrondissements', 'localites'].map(table);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// ABOMEY-CALAVI → Abomey-Calavi
const nice = (s) => s.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
const byNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202f/g, ' ');
const group = (rows, key) => {
  const m = new Map();
  for (const x of [...rows].sort(byNom)) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); }
  return m;
};
const comsOf = group(coms, 'departementId');
const arrsOf = group(arrs, 'communeId');
const locCount = new Map();
for (const l of locs) locCount.set(l.arrondissementId, (locCount.get(l.arrondissementId) || 0) + 1);
const comById = new Map(coms.map((c) => [c.id, c]));
const depById = new Map(deps.map((d) => [d.id, d]));

const N = { dep: deps.length, com: coms.length, arr: arrs.length, loc: locs.length };
const dateModified = raw.genereLe.slice(0, 10);
const dateFr = new Date(raw.genereLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

// Noms des départements (accents absents de la source) et article : « de l'Alibori », « du Borgou »…
const DEP = {
  ALIBORI: ['Alibori', "de l'"], ATACORA: ['Atacora', "de l'"], ATLANTIQUE: ['Atlantique', "de l'"],
  BORGOU: ['Borgou', 'du '], COLLINES: ['Collines', 'des '], COUFFO: ['Couffo', 'du '],
  DONGA: ['Donga', 'de la '], LITTORAL: ['Littoral', 'du '], MONO: ['Mono', 'du '],
  OUEME: ['Ouémé', "de l'"], PLATEAU: ['Plateau', 'du '], ZOU: ['Zou', 'du '],
};
const depNom = (d) => DEP[d.nom]?.[0] ?? nice(d.nom);
const depDe = (d) => (DEP[d.nom]?.[1] ?? 'de ') + depNom(d); // « de l'Alibori »
const LE = { "de l'": "l'", 'du ': 'le ', 'des ': 'les ', 'de la ': 'la ' };
const depLe = (d) => (LE[DEP[d.nom]?.[1]] ?? '') + depNom(d); // « l'Alibori », « le Borgou »
const de = (nom) => (/^[aeiouyéèêâîôûAEIOUYÉÈÊÂÎÔÛ]/.test(nom) ? "d'" : 'de ') + nom; // « d'Abomey », « de Kandi »
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs.at(-1)}`);
const plural = (n, one, many) => `${fmt(n)} ${n > 1 ? many : one}`;

// Statistiques par commune et par département.
const comStats = new Map(coms.map((c) => {
  const as = arrsOf.get(c.id) || [];
  return [c.id, { arr: as.length, loc: as.reduce((n, a) => n + (locCount.get(a.id) || 0), 0) }];
}));
const depStats = new Map(deps.map((d) => {
  const cs = comsOf.get(d.id) || [];
  return [d.id, cs.reduce((s, c) => ({ com: s.com + 1, arr: s.arr + comStats.get(c.id).arr, loc: s.loc + comStats.get(c.id).loc }), { com: 0, arr: 0, loc: 0 })];
}));
const depsSorted = [...deps].sort((a, b) => depNom(a).localeCompare(depNom(b), 'fr'));
const homologueOf = (d) => deps.find((x) => x.groupe === d.groupe && x.id !== d.id);
const chefOf = (d) => comById.get(d.chefLieuId);
const maxBy = (rows, f) => { const m = Math.max(...rows.map(f)); return rows.filter((x) => f(x) === m); };

const particuliers = coms.filter((c) => c.statut === 'PARTICULIER').map((c) => nice(c.nom)).sort();
const groupes = [...new Set(deps.map((d) => d.groupe))].sort().map((g) => list(deps.filter((d) => d.groupe === g).map(depNom)));
const topDep = maxBy(deps, (d) => depStats.get(d.id).com);

// Grandes zones géographiques (usage courant : nord, centre, sud).
const ZONES = [
  ['le Nord', ['ALIBORI', 'ATACORA', 'BORGOU', 'DONGA']],
  ['le Centre', ['COLLINES', 'ZOU']],
  ['le Sud', ['ATLANTIQUE', 'COUFFO', 'LITTORAL', 'MONO', 'OUEME', 'PLATEAU']],
].map(([nom, codes]) => {
  const ds = deps.filter((d) => codes.includes(d.nom)).sort((a, b) => depNom(a).localeCompare(depNom(b), 'fr'));
  const s = ds.reduce((t, d) => { const x = depStats.get(d.id); return { com: t.com + x.com, arr: t.arr + x.arr, loc: t.loc + x.loc }; }, { com: 0, arr: 0, loc: 0 });
  return { nom, ds, ...s };
});
const topComArr = maxBy(coms, (c) => comStats.get(c.id).arr);
const topComLoc = maxBy(coms, (c) => comStats.get(c.id).loc);

// Questions générales : affichées sur la page ET balisées (FAQPage).
const faq = [
  ['Quelle est la répartition géographique du Bénin ?',
    `Situé en Afrique de l’Ouest, le Bénin s’étend sur environ 115 000 km², de l’océan Atlantique (golfe de Guinée) au sud jusqu’au fleuve Niger au nord. Il est bordé par le Togo à l’ouest, le Nigeria à l’est, le Burkina Faso et le Niger au nord. Son territoire est réparti en ${N.dep} départements, ${N.com} communes, ${fmt(N.arr)} arrondissements et ${fmt(N.loc)} villages et quartiers de ville : ` +
      ZONES.map((z) => `${z.nom} (${list(z.ds.map(depNom))})`).join(', ') + '.'],
  ['Comment les communes et les villages sont-ils répartis entre le nord, le centre et le sud du Bénin ?',
    ZONES.map((z) => `${z.nom.replace(/^le /, 'Le ')} compte ${plural(z.ds.length, 'département', 'départements')}, ${plural(z.com, 'commune', 'communes')}, ${plural(z.arr, 'arrondissement', 'arrondissements')} et ${plural(z.loc, 'village ou quartier', 'villages et quartiers')}`).join('. ') + '.'],
  ['Où trouver une base de données de la répartition géographique du Bénin ?',
    `Cette page propose gratuitement la base de données complète du découpage territorial du Bénin (${N.dep} départements, ${N.com} communes, ${fmt(N.arr)} arrondissements, ${fmt(N.loc)} villages et quartiers) : consultation en ligne, téléchargement en JSON ou en SQL (PostgreSQL, MySQL, SQLite) et API REST open source.`],
  ['Combien de départements compte le Bénin ?',
    `Le Bénin compte ${N.dep} départements : ${list(depsSorted.map(depNom))}.`],
  ['Quels sont les chefs-lieux des départements du Bénin ?',
    depsSorted.map((d) => `${depNom(d)} : ${chefOf(d) ? nice(chefOf(d).nom) : 'non renseigné'}`).join(' ; ') + '.'],
  ['Combien de communes compte le Bénin ?',
    `Le Bénin compte ${N.com} communes, dont ${particuliers.length} à statut particulier : ${list(particuliers)}.`],
  ['Combien de communes compte chaque département du Bénin ?',
    depsSorted.map((d) => `${depNom(d)} : ${depStats.get(d.id).com}`).join(' ; ') +
      `. ${topDep.length > 1 ? 'Les départements qui en comptent le plus sont' : 'Le département qui en compte le plus est'} ${list(topDep.map(depLe))}, avec ${depStats.get(topDep[0].id).com} communes.`],
  ['Quelles sont les communes à statut particulier du Bénin ?',
    `${list(particuliers)} sont des communes à statut particulier : la loi leur applique un régime d’organisation spécifique, en raison de leur taille et de leur rôle de grandes villes.`],
  ['Combien d’arrondissements et de villages compte le Bénin ?',
    `Les ${N.com} communes sont divisées en ${fmt(N.arr)} arrondissements, eux-mêmes composés de ${fmt(N.loc)} villages (en zone rurale) et quartiers de ville (en zone urbaine).`],
  ['Quelle commune du Bénin compte le plus d’arrondissements et de villages ?',
    `${list(topComArr.map((c) => nice(c.nom)))} ${topComArr.length > 1 ? 'comptent' : 'compte'} le plus d’arrondissements (${comStats.get(topComArr[0].id).arr}). ${list(topComLoc.map((c) => nice(c.nom)))} ${topComLoc.length > 1 ? 'comptent' : 'compte'} le plus de villages et quartiers de ville (${comStats.get(topComLoc[0].id).loc}).`],
  ['Quelle est la différence entre département, commune et arrondissement au Bénin ?',
    'Le département est une circonscription administrative de l’État, dirigée par un préfet. La commune est la collectivité territoriale décentralisée, administrée par un conseil communal et un maire. L’arrondissement est une subdivision de la commune, dirigée par un chef d’arrondissement ; il regroupe des villages ou des quartiers de ville.'],
  ['Quelle est la différence entre un village et un quartier de ville ?',
    'Ce sont les plus petites unités administratives du Bénin, rattachées chacune à un arrondissement : on parle de village en zone rurale et de quartier de ville en zone urbaine.'],
  ['Quels sont les départements homologues du Bénin ?',
    `Les ${N.dep} départements sont regroupés deux à deux : ${groupes.join(' ; ')}.`],
  ['Quelle est la capitale du Bénin ?',
    'Porto-Novo, dans le département de l’Ouémé, est la capitale officielle du Bénin. Cotonou, dans le département du Littoral, est la plus grande ville et le siège du gouvernement.'],
  ['Comment télécharger la liste des communes, arrondissements et villages du Bénin ?',
    'Utilisez le bouton « Télécharger les données » : le Bénin entier, ou un département, une commune ou un arrondissement avec ses subdivisions, au format JSON ou SQL (PostgreSQL, MySQL, SQLite). Gratuit et sans inscription.'],
  ['Existe-t-il une API du découpage territorial du Bénin ?',
    `Oui. Le code source est ouvert (licence MIT) : une API REST permet d’interroger départements, communes, arrondissements et localités, avec recherche et pagination. Voir ${REPO}.`],
  ['D’où viennent ces données ?',
    `Elles proviennent du projet open source bj-decoupage-territorial de Junior Gantin, et ont été mises à jour sur ce site le ${dateFr}. Des réformes administratives plus récentes peuvent ne pas y figurer.`],
];

// Une question par département et par commune (affichées dans la liste et balisées).
const depQ = (d) => `Quelles sont les communes du département ${depDe(d)} ?`;
const depA = (d) => {
  const s = depStats.get(d.id);
  const h = homologueOf(d);
  const chef = chefOf(d);
  return `Le département ${depDe(d)} compte ${plural(s.com, 'commune', 'communes')} : ${list((comsOf.get(d.id) || []).map((c) => nice(c.nom)))}.` +
    (chef ? ` Son chef-lieu est ${nice(chef.nom)}.` : '') +
    ` Il regroupe ${plural(s.arr, 'arrondissement', 'arrondissements')} et ${plural(s.loc, 'village ou quartier de ville', 'villages et quartiers de ville')}.` +
    (h ? ` Son département homologue est celui ${depDe(h)}.` : '');
};
const comQ = (c) => `Quels sont les arrondissements de la commune ${de(nice(c.nom))} ?`;
const comA = (c) => {
  const s = comStats.get(c.id);
  return `La commune ${de(nice(c.nom))}${c.statut === 'PARTICULIER' ? ' (à statut particulier)' : ''}, dans le département ${depDe(depById.get(c.departementId))}, compte ${plural(s.arr, 'arrondissement', 'arrondissements')} et ${plural(s.loc, 'village ou quartier de ville', 'villages et quartiers de ville')} : ${list((arrsOf.get(c.id) || []).map((a) => nice(a.nom)))}.`;
};
const allQuestions = [
  ...faq,
  ...depsSorted.flatMap((d) => [[depQ(d), depA(d)], ...(comsOf.get(d.id) || []).map((c) => [comQ(c), comA(c)])]),
];

const content = `<section class="about" aria-labelledby="about-title">
  <h2 id="about-title">Le découpage territorial du Bénin en bref</h2>
  <p>Base de données de la répartition géographique et administrative du Bénin. La République du Bénin est organisée en <strong>${N.dep} départements</strong>, <strong>${N.com} communes</strong>, <strong>${fmt(N.arr)} arrondissements</strong> et <strong>${fmt(N.loc)} villages et quartiers de ville</strong>. Cette page permet de parcourir ce découpage administratif, de rechercher une localité et de télécharger les données au format JSON ou SQL.</p>
  <div class="faq">
${faq.map(([q, a]) => `    <div><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('\n')}
  </div>
  <h2>Départements, communes et arrondissements du Bénin : questions par territoire</h2>
  <p>Pour chaque département : ses communes, son chef-lieu et son homologue. Pour chaque commune : ses arrondissements. Ouvrez un département pour voir le détail.</p>
${depsSorted.map((d) => {
  const s = depStats.get(d.id);
  return `  <details>
    <summary><h3>${esc(depQ(d))}</h3> <span>— ${plural(s.com, 'commune', 'communes')}, ${plural(s.arr, 'arrondissement', 'arrondissements')}</span></summary>
    <p class="answer">${esc(depA(d))}</p>
    <ul>
${(comsOf.get(d.id) || []).map((c) => `      <li><h4>${esc(comQ(c))}</h4><p>${esc(comA(c))}</p></li>`).join('\n')}
    </ul>
  </details>`;
}).join('\n')}
  <footer>Données issues du projet <a href="${SOURCE}">bj-decoupage-territorial</a> de Junior Gantin, mises à jour le ${dateFr}. Code source et API : <a href="${REPO}">${REPO.replace('https://', '')}</a>.</footer>
</section>`;

const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': SITE + '#site',
      url: SITE,
      name: 'Découpage territorial du Bénin',
      inLanguage: 'fr',
    },
    {
      '@type': 'Dataset',
      '@id': SITE + '#dataset',
      name: 'Découpage territorial du Bénin',
      alternateName: ['Base de données de la répartition géographique du Bénin', 'Liste des communes du Bénin', 'Départements, communes, arrondissements et villages du Bénin'],
      description: `Découpage administratif complet de la République du Bénin : ${N.dep} départements, ${N.com} communes, ${N.arr} arrondissements et ${N.loc} villages et quartiers de ville, avec leurs liens hiérarchiques, chefs-lieux et départements homologues. Téléchargeable en JSON et en SQL.`,
      url: SITE,
      sameAs: REPO,
      isBasedOn: SOURCE,
      keywords: ['Bénin', 'découpage territorial', 'répartition géographique', 'base de données', 'découpage administratif', 'départements', 'communes', 'arrondissements', 'villages', 'quartiers de ville', 'administration territoriale'],
      inLanguage: 'fr',
      isAccessibleForFree: true,
      license: 'https://opensource.org/licenses/MIT',
      creator: { '@type': 'Person', name: 'toundji', url: 'https://github.com/toundji' },
      dateModified,
      spatialCoverage: { '@type': 'Place', name: 'Bénin', address: { '@type': 'PostalAddress', addressCountry: 'BJ' } },
      variableMeasured: ['département', 'commune', 'arrondissement', 'village ou quartier de ville', 'chef-lieu', 'département homologue'],
      distribution: [
        { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: SITE + 'data/decoupage.json' },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': SITE + '#faq',
      mainEntity: allQuestions.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
};

const replaceBetween = (html, key, inner) => {
  const re = new RegExp(`<!-- seo:${key}:start -->[\\s\\S]*?<!-- seo:${key}:end -->`);
  if (!re.test(html)) throw new Error(`marqueurs seo:${key} absents de index.html`);
  return html.replace(re, `<!-- seo:${key}:start -->\n${inner}\n<!-- seo:${key}:end -->`);
};

const file = join(pub, 'index.html');
let html = readFileSync(file, 'utf8');
html = replaceBetween(html, 'jsonld', `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`);
html = replaceBetween(html, 'content', content);
writeFileSync(file, html);

writeFileSync(join(pub, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${dateModified}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`);

console.log(`index.html : ${faq.length} questions générales + ${allQuestions.length - faq.length} par territoire (${N.dep} départements, ${N.com} communes) ; sitemap.xml (${dateModified})`);
