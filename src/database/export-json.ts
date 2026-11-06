/**
 * Exporte le découpage territorial (départements → localités) en JSON compact,
 * pour la version statique de la page d'exploration (GitHub Pages).
 *
 *   npm run build && npm run export:json
 *
 * Écrit public/data/decoupage.json (même format que GET /api/v1/export).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildSnapshot } from '../export/snapshot.js';
import { dataSourceOptions } from './data-source.js';

try {
  process.loadEnvFile();
} catch {
  // pas de .env : variables d'environnement du système
}

const ds = new DataSource(dataSourceOptions());
await ds.initialize();
try {
  const snapshot = await buildSnapshot(ds);
  for (const name of ['departements', 'communes', 'arrondissements', 'localites'] as const) {
    console.log(`  ${name} : ${snapshot[name].lignes.length}`);
  }
  const dir = join(import.meta.dirname, '..', '..', 'public', 'data');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'decoupage.json');
  writeFileSync(file, JSON.stringify(snapshot));
  console.log(`Écrit : ${file}`);
} finally {
  await ds.destroy();
}
