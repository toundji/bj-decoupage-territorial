import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Administrateur } from '../administrateurs/administrateur.entity.js';
import { Arrondissement } from '../arrondissements/arrondissement.entity.js';
import { Batiment } from '../batiments/batiment.entity.js';
import { Commune } from '../communes/commune.entity.js';
import { Departement } from '../departements/departement.entity.js';
import { Localite } from '../localites/localite.entity.js';
import { PropositionNomRue } from '../propositions/proposition-nom-rue.entity.js';
import { Rue } from '../rues/rue.entity.js';

export const ENTITIES = [
  Departement,
  Commune,
  Arrondissement,
  Localite,
  Rue,
  Batiment,
  PropositionNomRue,
  Administrateur,
];

export function dataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'bj_decoupage_territorial',
    entities: ENTITIES,
    synchronize: env.DB_SYNCHRONIZE === 'true',
  };
}

/** Utilisé par la CLI TypeORM et le script de seed. */
export default new DataSource(dataSourceOptions());
