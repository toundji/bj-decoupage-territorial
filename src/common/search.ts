import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Filtre `nom` insensible à la casse et aux accents (extension unaccent). */
export function whereNomLike<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  q?: string,
): SelectQueryBuilder<T> {
  if (q?.trim()) {
    qb.andWhere(`unaccent(${alias}.nom) ILIKE unaccent(:q)`, {
      q: `%${q.trim()}%`,
    });
  }
  return qb;
}
