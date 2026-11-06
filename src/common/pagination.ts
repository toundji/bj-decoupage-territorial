import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQuery {
  // Type explicite obligatoire : sans annotation, TypeScript émet
  // design:type = Object et Swagger UI ne sait plus construire la requête.
  @ApiPropertyOptional({ type: 'integer', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    type: 'integer',
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 50;

  @ApiPropertyOptional({
    description: 'Recherche sur le nom (insensible à la casse et aux accents)',
  })
  @IsOptional()
  @IsString()
  q?: string;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function toPage<T>(
  [data, total]: [T[], number],
  q: PaginationQuery,
): Page<T> {
  return { data, total, page: q.page, limit: q.limit };
}
