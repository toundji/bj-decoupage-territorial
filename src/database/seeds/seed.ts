/**
 * Initialise la base : extensions PostGIS/unaccent, schéma, puis import du
 * découpage territorial (data/decoupage-territorial.sql, issu du projet
 * bj-decoupage-territorial). Idempotent : ne fait rien si des départements existent.
 *
 *   npm run build && npm run seed
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource, type EntityManager } from 'typeorm';
import { GroupeDepartement as G, StatutCommune } from '../../common/enums.js';
import { dataSourceOptions } from '../data-source.js';

try {
  process.loadEnvFile();
} catch {
  // pas de .env : variables d'environnement du système
}

/** Code ISO 3166-2:BJ, groupe d'homologues et commune chef-lieu par département. */
const DEPARTEMENTS: Record<
  string,
  { code: string; groupe: G; chefLieu: string }
> = {
  ALIBORI: { code: 'AL', groupe: G.BORGOU_ALIBORI, chefLieu: 'KANDI' },
  ATACORA: { code: 'AK', groupe: G.ATACORA_DONGA, chefLieu: 'NATITINGOU' },
  ATLANTIQUE: { code: 'AQ', groupe: G.ATLANTIQUE_LITTORAL, chefLieu: 'ALLADA' },
  BORGOU: { code: 'BO', groupe: G.BORGOU_ALIBORI, chefLieu: 'PARAKOU' },
  COLLINES: { code: 'CO', groupe: G.ZOU_COLLINES, chefLieu: 'DASSA-ZOUME' },
  COUFFO: { code: 'KO', groupe: G.MONO_COUFFO, chefLieu: 'APLAHOUE' },
  DONGA: { code: 'DO', groupe: G.ATACORA_DONGA, chefLieu: 'DJOUGOU' },
  LITTORAL: { code: 'LI', groupe: G.ATLANTIQUE_LITTORAL, chefLieu: 'COTONOU' },
  MONO: { code: 'MO', groupe: G.MONO_COUFFO, chefLieu: 'LOKOSSA' },
  OUEME: { code: 'OU', groupe: G.OUEME_PLATEAU, chefLieu: 'PORTO-NOVO' },
  PLATEAU: { code: 'PL', groupe: G.OUEME_PLATEAU, chefLieu: 'POBE' },
  ZOU: { code: 'ZO', groupe: G.ZOU_COLLINES, chefLieu: 'ABOMEY' },
};

/** Communes à statut particulier (loi n° 98-005). */
const STATUT_PARTICULIER = new Set(['COTONOU', 'PORTO-NOVO', 'PARAKOU']);

type Row = { id: number; nom: string; parentId: number };

function parseDump(path: string): Record<string, Row[]> {
  const sql = readFileSync(path, 'utf8');
  const tables: Record<string, Row[]> = {};
  const block = /INSERT INTO (\w+)\([^)]*\) VALUES([\s\S]*?);/g;
  const tuple = /\((\d+),\s*'((?:[^']|'')*)'(?:,\s*(\d+))?\)/g;
  for (const [, table, values] of sql.matchAll(block)) {
    const rows = (tables[table] ??= []);
    for (const [, id, nom, parentId] of values.matchAll(tuple)) {
      rows.push({
        id: +id,
        nom: nom.replace(/''/g, "'").trim(),
        parentId: parentId ? +parentId : 0,
      });
    }
  }
  return tables;
}

/** Retire les doublons (même parent + même nom), qui violeraient l'index unique. */
function dedupe(table: string, rows: Row[]): Row[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.parentId}|${r.nom}`;
    if (!seen.has(key)) return seen.add(key);
    console.warn(
      `  doublon ignoré dans ${table} : #${r.id} « ${r.nom} » (parent ${r.parentId})`,
    );
    return false;
  });
}

/** INSERT paramétré par lots ; les id d'origine sont conservés puis la séquence est recalée. */
async function insert(
  tx: EntityManager,
  table: string,
  columns: string[],
  rows: unknown[][],
) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params: unknown[] = [];
    const tuples = chunk.map(
      (row) =>
        `(${row.map((v) => (params.push(v), `$${params.length}`)).join(', ')})`,
    );
    await tx.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}`,
      params,
    );
  }
  await tx.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`,
  );
  console.log(`  ${table} : ${rows.length}`);
}

async function main() {
  const ds = new DataSource({ ...dataSourceOptions(), synchronize: false });
  await ds.initialize();
  try {
    await ds.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await ds.query('CREATE EXTENSION IF NOT EXISTS unaccent');
    await ds.synchronize();

    const [{ count }] = await ds.query(
      'SELECT COUNT(*)::int AS count FROM departement',
    );
    if (count > 0) {
      console.log('Base déjà initialisée, rien à faire.');
      return;
    }

    const dump = parseDump(resolve('data/decoupage-territorial.sql'));

    await ds.transaction(async (tx) => {
      await insert(
        tx,
        'departement',
        ['id', 'nom', 'code', 'groupe'],
        dump.departments.map((d) => {
          const info = DEPARTEMENTS[d.nom];
          if (!info) throw new Error(`Département inconnu : ${d.nom}`);
          return [d.id, d.nom, info.code, info.groupe];
        }),
      );
      await insert(
        tx,
        'commune',
        ['id', 'nom', 'departement_id', 'statut'],
        dedupe('commune', dump.towns).map((r) => [
          r.id,
          r.nom,
          r.parentId,
          STATUT_PARTICULIER.has(r.nom)
            ? StatutCommune.PARTICULIER
            : StatutCommune.ORDINAIRE,
        ]),
      );
      await insert(
        tx,
        'arrondissement',
        ['id', 'nom', 'commune_id'],
        dedupe('arrondissement', dump.districts).map((r) => [
          r.id,
          r.nom,
          r.parentId,
        ]),
      );
      await insert(
        tx,
        'localite',
        ['id', 'nom', 'arrondissement_id'],
        dedupe('localite', dump.neighborhoods).map((r) => [
          r.id,
          r.nom,
          r.parentId,
        ]),
      );

      for (const [nom, { chefLieu }] of Object.entries(DEPARTEMENTS)) {
        const [, updated] = await tx.query(
          `UPDATE departement d SET chef_lieu_id = c.id
             FROM commune c
            WHERE d.nom = $1 AND c.nom = $2 AND c.departement_id = d.id`,
          [nom, chefLieu],
        );
        if (updated !== 1)
          console.warn(`  chef-lieu non trouvé pour ${nom} (${chefLieu})`);
      }
    });
    console.log('Import terminé.');
  } finally {
    await ds.destroy();
  }
}

await main();
