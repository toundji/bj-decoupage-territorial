/**
 * Exporte le découpage territorial (départements → localités) en JSON compact,
 * pour la version statique de la page d'exploration (GitHub Pages).
 *
 *   npm run build && npm run export:json
 *
 * Écrit public/data/decoupage.json. Chaque table est un tableau de lignes ;
 * l'ordre des valeurs est donné par `champs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.js';

try {
  process.loadEnvFile();
} catch {
  // pas de .env : variables d'environnement du système
}

const TABLES = {
  departements: {
    champs: ['id', 'code', 'nom', 'groupe', 'chefLieuId'],
    sql: 'SELECT id, code, nom, groupe, chef_lieu_id FROM departement ORDER BY id',
  },
  communes: {
    champs: ['id', 'code', 'nom', 'statut', 'departementId', 'chefLieuId'],
    sql: 'SELECT id, code, nom, statut, departement_id, chef_lieu_id FROM commune ORDER BY id',
  },
  arrondissements: {
    champs: ['id', 'code', 'nom', 'communeId', 'chefLieuId'],
    sql: 'SELECT id, code, nom, commune_id, chef_lieu_id FROM arrondissement ORDER BY id',
  },
  localites: {
    champs: ['id', 'nom', 'type', 'arrondissementId'],
    sql: 'SELECT id, nom, type, arrondissement_id FROM localite ORDER BY id',
  },
};

const ds = new DataSource(dataSourceOptions());
await ds.initialize();
try {
  const out: Record<string, unknown> = { genereLe: new Date().toISOString() };
  for (const [name, { champs, sql }] of Object.entries(TABLES)) {
    const rows: Record<string, unknown>[] = await ds.query(sql);
    out[name] = { champs, lignes: rows.map((r) => Object.values(r)) };
    console.log(`  ${name} : ${rows.length}`);
  }
  const dir = join(import.meta.dirname, '..', '..', 'public', 'data');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'decoupage.json');
  writeFileSync(file, JSON.stringify(out));
  console.log(`Écrit : ${file}`);
} finally {
  await ds.destroy();
}
