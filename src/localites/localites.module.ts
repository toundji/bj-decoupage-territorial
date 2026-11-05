import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Repository } from 'typeorm';
import { TypeLocalite } from '../common/enums.js';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { whereNomLike } from '../common/search.js';
import { Rue } from '../rues/rue.entity.js';
import { Localite } from './localite.entity.js';

export class LocalitesQuery extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  arrondissementId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;

  @ApiPropertyOptional({ enum: TypeLocalite, enumName: 'TypeLocalite' })
  @IsOptional()
  @IsEnum(TypeLocalite)
  type?: TypeLocalite;
}

@Injectable()
export class LocalitesService {
  constructor(
    @InjectRepository(Localite) private readonly repo: Repository<Localite>,
    @InjectRepository(Rue) private readonly rues: Repository<Rue>,
  ) {}

  async findAll(query: LocalitesQuery) {
    const qb = this.repo
      .createQueryBuilder('l')
      .orderBy('l.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.arrondissementId)
      qb.andWhere('l.arrondissementId = :a', { a: query.arrondissementId });
    if (query.communeId) {
      qb.innerJoin('l.arrondissement', 'a').andWhere('a.communeId = :c', {
        c: query.communeId,
      });
    }
    if (query.type) qb.andWhere('l.type = :t', { t: query.type });
    return toPage(
      await whereNomLike(qb, 'l', query.q).getManyAndCount(),
      query,
    );
  }

  async findOne(id: number) {
    const l = await this.repo.findOne({
      where: { id },
      relations: { arrondissement: { commune: { departement: true } } },
    });
    if (!l) throw new NotFoundException(`Localité ${id} introuvable`);
    return l;
  }

  async ruesOf(id: number, query: PaginationQuery) {
    await this.findOne(id);
    const qb = this.rues
      .createQueryBuilder('r')
      .innerJoin('r.localites', 'l', 'l.id = :id', { id })
      .orderBy('r.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    return toPage(
      await whereNomLike(qb, 'r', query.q).getManyAndCount(),
      query,
    );
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'geom', 'Localité');
  }
}

@ApiTags('Localités')
@Controller('localites')
export class LocalitesController {
  constructor(private readonly service: LocalitesService) {}

  @Get()
  @ApiOperation({
    summary: 'Liste paginée des localités (villages / quartiers)',
  })
  findAll(@Query() query: LocalitesQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: Localite })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/rues')
  @ApiOperation({ summary: 'Rues qui traversent la localité' })
  rues(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQuery) {
    return this.service.ruesOf(id, query);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: 'Contour de la localité (Feature GeoJSON)' })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Localite, Rue])],
  controllers: [LocalitesController],
  providers: [LocalitesService],
})
export class LocalitesModule {}
