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
const particuliers = coms.filter((c) => c.statut === 'PARTICULIER').map((c) => nice(c.nom)).sort();
const groupes = [...new Set(deps.map((d) => d.groupe))].sort().map((g) => g.split('-').map(nice).join(' et '));

// Questions fréquentes : affichées sur la page ET balisées (FAQPage).
const faq = [
  ['Combien de départements compte le Bénin ?',
    `Le Bénin compte ${N.dep} départements : ${[...deps].sort(byNom).map((d) => nice(d.nom)).join(', ')}.`],
  ['Combien de communes compte le Bénin ?',
    `Le Bénin compte ${N.com} communes, dont ${particuliers.length} à statut particulier : ${particuliers.join(', ')}.`],
  ['Combien d’arrondissements et de villages compte le Bénin ?',
    `Les communes sont divisées en ${fmt(N.arr)} arrondissements, eux-mêmes composés de ${fmt(N.loc)} villages (en zone rurale) et quartiers de ville (en zone urbaine).`],
  ['Quels sont les départements homologues du Bénin ?',
    `Les départements sont regroupés deux à deux : ${groupes.join(' ; ')}.`],
  ['Comment télécharger la liste des communes du Bénin ?',
    'Utilisez le bouton « Télécharger les données » : le Bénin entier, ou un département, une commune ou un arrondissement avec ses subdivisions, au format JSON ou SQL (PostgreSQL, MySQL, SQLite). Gratuit et sans inscription.'],
];

const content = `<section class="about" aria-labelledby="about-title">
  <h2 id="about-title">Le découpage territorial du Bénin en bref</h2>
  <p>La République du Bénin est organisée en <strong>${N.dep} départements</strong>, <strong>${N.com} communes</strong>, <strong>${fmt(N.arr)} arrondissements</strong> et <strong>${fmt(N.loc)} villages et quartiers de ville</strong>. Cette page permet de parcourir ce découpage administratif, de rechercher une localité et de télécharger les données au format JSON ou SQL.</p>
  <div class="faq">
${faq.map(([q, a]) => `    <div><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('\n')}
  </div>
  <h2>Liste des départements, communes et arrondissements du Bénin</h2>
${[...deps].sort(byNom).map((d) => {
  const cs = comsOf.get(d.id) || [];
  const chef = comById.get(d.chefLieuId);
  const nArr = cs.reduce((n, c) => n + (arrsOf.get(c.id) || []).length, 0);
  return `  <details>
    <summary><h3>Département ${esc(nice(d.nom))}</h3> <span>— ${cs.length} communes, ${nArr} arrondissements${chef ? `, chef-lieu ${esc(nice(chef.nom))}` : ''}</span></summary>
    <ul>
${cs.map((c) => {
  const as = arrsOf.get(c.id) || [];
  const nLoc = as.reduce((n, a) => n + (locCount.get(a.id) || 0), 0);
  return `      <li><strong>${esc(nice(c.nom))}</strong>${c.statut === 'PARTICULIER' ? ' (statut particulier)' : ''} <span>— ${as.length} arrondissements, ${nLoc} villages et quartiers :</span> ${as.map((a) => esc(nice(a.nom))).join(', ')}</li>`;
}).join('\n')}
    </ul>
  </details>`;
}).join('\n')}
  <footer>Données issues du projet <a href="${SOURCE}">bj-decoupage-territorial</a> de Junior Gantin, mises à jour le ${new Date(raw.genereLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Code source et API : <a href="${REPO}">${REPO.replace('https://', '')}</a>.</footer>
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
      alternateName: ['Liste des communes du Bénin', 'Départements, communes, arrondissements et villages du Bénin'],
      description: `Découpage administratif complet de la République du Bénin : ${N.dep} départements, ${N.com} communes, ${N.arr} arrondissements et ${N.loc} villages et quartiers de ville, avec leurs liens hiérarchiques, chefs-lieux et départements homologues. Téléchargeable en JSON et en SQL.`,
      url: SITE,
      sameAs: REPO,
      isBasedOn: SOURCE,
      keywords: ['Bénin', 'découpage territorial', 'départements', 'communes', 'arrondissements', 'villages', 'quartiers de ville', 'administration territoriale'],
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
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
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

console.log(`index.html : ${N.dep} départements, ${N.com} communes, ${N.arr} arrondissements ; sitemap.xml (${dateModified})`);
