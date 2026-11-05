import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 50;

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
