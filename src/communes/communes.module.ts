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
import { Arrondissement } from '../arrondissements/arrondissement.entity.js';
import { StatutCommune } from '../common/enums.js';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { whereNomLike } from '../common/search.js';
import { Commune } from './commune.entity.js';

export class CommunesQuery extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departementId?: number;

  @ApiPropertyOptional({ enum: StatutCommune, enumName: 'StatutCommune' })
  @IsOptional()
  @IsEnum(StatutCommune)
  statut?: StatutCommune;
}

@Injectable()
export class CommunesService {
  constructor(
    @InjectRepository(Commune) private readonly repo: Repository<Commune>,
    @InjectRepository(Arrondissement)
    private readonly arrondissements: Repository<Arrondissement>,
  ) {}

  async findAll(query: CommunesQuery) {
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.departementId)
      qb.andWhere('c.departementId = :d', { d: query.departementId });
    if (query.statut) qb.andWhere('c.statut = :s', { s: query.statut });
    return toPage(
      await whereNomLike(qb, 'c', query.q).getManyAndCount(),
      query,
    );
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { departement: true, chefLieu: true },
    });
    if (!c) throw new NotFoundException(`Commune ${id} introuvable`);
    return c;
  }

  async arrondissementsOf(id: number, query: PaginationQuery) {
    await this.findOne(id);
    const qb = this.arrondissements
      .createQueryBuilder('a')
      .where('a.communeId = :id', { id })
      .orderBy('a.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    return toPage(
      await whereNomLike(qb, 'a', query.q).getManyAndCount(),
      query,
    );
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'geom', 'Commune');
  }
}

@ApiTags('Communes')
@Controller('communes')
export class CommunesController {
  constructor(private readonly service: CommunesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des communes (filtrable par département, statut, nom)',
  })
  findAll(@Query() query: CommunesQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: Commune })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/arrondissements')
  @ApiOperation({ summary: 'Arrondissements de la commune' })
  arrondissements(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQuery,
  ) {
    return this.service.arrondissementsOf(id, query);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: 'Contour de la commune (Feature GeoJSON)' })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Commune, Arrondissement])],
  controllers: [CommunesController],
  providers: [CommunesService],
})
export class CommunesModule {}
