import type { DataSource } from 'typeorm';

/**
 * Instantané compact du découpage (départements → localités).
 * Chaque table est un tableau de lignes ; l'ordre des valeurs est donné par `champs`.
 * Format partagé par GET /api/v1/export et `npm run export:json`
 * (public/data/decoupage.json, lu par la page d'exploration).
 */
export interface Snapshot {
  genereLe: string;
  departements: Table;
  communes: Table;
  arrondissements: Table;
  localites: Table;
}

export interface Table {
  champs: string[];
  lignes: unknown[][];
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
} as const;

export async function buildSnapshot(ds: DataSource): Promise<Snapshot> {
  const out = { genereLe: new Date().toISOString() } as Snapshot;
  for (const [name, { champs, sql }] of Object.entries(TABLES)) {
    const rows: Record<string, unknown>[] = await ds.query(sql);
    out[name as keyof typeof TABLES] = {
      champs: [...champs],
      lignes: rows.map((r) => Object.values(r)),
    };
  }
  return out;
}
