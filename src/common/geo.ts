import { NotFoundException } from '@nestjs/common';
import type { Feature, Geometry } from 'geojson';
import type { ObjectLiteral, Repository } from 'typeorm';

/** Colonne géométrique PostGIS (SRID 4326, WGS84), renvoyée en GeoJSON par TypeORM. */
export const geometryColumn = (spatialFeatureType: string) =>
  ({
    type: 'geometry',
    spatialFeatureType,
    srid: 4326,
    nullable: true,
    select: false,
  }) as const;

/**
 * Charge une entité avec sa (ses) colonne(s) géométrique(s) et la renvoie
 * sous forme de Feature GeoJSON. Les géométries sont exclues des listes
 * (select: false) pour garder des réponses légères.
 */
export async function loadFeature<T extends ObjectLiteral & { id: number }>(
  repo: Repository<T>,
  id: number,
  geomField: keyof T & string,
  label: string,
): Promise<Feature<Geometry | null>> {
  const alias = 'e';
  const entity = await repo
    .createQueryBuilder(alias)
    .addSelect(`${alias}.${geomField}`)
    .where(`${alias}.id = :id`, { id })
    .getOne();
  if (!entity) throw new NotFoundException(`${label} ${id} introuvable`);
  const { [geomField]: geometry, ...properties } = entity;
  return {
    type: 'Feature',
    id: entity.id,
    geometry: (geometry as Geometry | null) ?? null,
    properties,
  };
}
