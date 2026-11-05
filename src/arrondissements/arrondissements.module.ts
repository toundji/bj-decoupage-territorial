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
import { IsInt, IsOptional } from 'class-validator';
import { Repository } from 'typeorm';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { whereNomLike } from '../common/search.js';
import { Localite } from '../localites/localite.entity.js';
import { Arrondissement } from './arrondissement.entity.js';

export class ArrondissementsQuery extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departementId?: number;
}

@Injectable()
export class ArrondissementsService {
  constructor(
    @InjectRepository(Arrondissement)
    private readonly repo: Repository<Arrondissement>,
    @InjectRepository(Localite)
    private readonly localites: Repository<Localite>,
  ) {}

  async findAll(query: ArrondissementsQuery) {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.communeId)
      qb.andWhere('a.communeId = :c', { c: query.communeId });
    if (query.departementId) {
      qb.innerJoin('a.commune', 'c').andWhere('c.departementId = :d', {
        d: query.departementId,
      });
    }
    return toPage(
      await whereNomLike(qb, 'a', query.q).getManyAndCount(),
      query,
    );
  }

  async findOne(id: number) {
    const a = await this.repo.findOne({
      where: { id },
      relations: { commune: { departement: true }, chefLieu: true },
    });
    if (!a) throw new NotFoundException(`Arrondissement ${id} introuvable`);
    return a;
  }

  async localitesOf(id: number, query: PaginationQuery) {
    await this.findOne(id);
    const qb = this.localites
      .createQueryBuilder('l')
      .where('l.arrondissementId = :id', { id })
      .orderBy('l.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    return toPage(
      await whereNomLike(qb, 'l', query.q).getManyAndCount(),
      query,
    );
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'geom', 'Arrondissement');
  }
}

@ApiTags('Arrondissements')
@Controller('arrondissements')
export class ArrondissementsController {
  constructor(private readonly service: ArrondissementsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des arrondissements (filtrable par commune, département, nom)',
  })
  findAll(@Query() query: ArrondissementsQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: Arrondissement })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/localites')
  @ApiOperation({
    summary: "Localités (villages / quartiers) de l'arrondissement",
  })
  localites(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQuery,
  ) {
    return this.service.localitesOf(id, query);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: "Contour de l'arrondissement (Feature GeoJSON)" })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Arrondissement, Localite])],
  controllers: [ArrondissementsController],
  providers: [ArrondissementsService],
})
export class ArrondissementsModule {}
