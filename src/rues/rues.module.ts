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
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Repository } from 'typeorm';
import { Commune } from '../communes/commune.entity.js';
import { TypeRue } from '../common/enums.js';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { whereNomLike } from '../common/search.js';
import { Rue } from './rue.entity.js';

export class RuesQuery extends PaginationQuery {
  @ApiPropertyOptional({ description: 'Rues traversant cette localité' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  localiteId?: number;

  @ApiPropertyOptional({ description: 'Rues traversant cette commune' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  communeId?: number;

  @ApiPropertyOptional({ enum: TypeRue, enumName: 'TypeRue' })
  @IsOptional()
  @IsEnum(TypeRue)
  type?: TypeRue;
}

@Injectable()
export class RuesService {
  constructor(
    @InjectRepository(Rue) private readonly repo: Repository<Rue>,
    @InjectRepository(Commune) private readonly communes: Repository<Commune>,
  ) {}

  async findAll(query: RuesQuery) {
    const qb = this.repo
      .createQueryBuilder('r')
      .orderBy('r.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.type) qb.andWhere('r.type = :t', { t: query.type });
    if (query.localiteId || query.communeId) {
      // EXISTS pour ne pas dupliquer une rue qui traverse plusieurs localités
      const sub = this.repo.manager
        .createQueryBuilder()
        .select('1')
        .from('rue_localite', 'rl')
        .innerJoin('localite', 'l', 'l.id = rl.localite_id')
        .innerJoin('arrondissement', 'a', 'a.id = l.arrondissement_id')
        .where('rl.rue_id = r.id');
      if (query.localiteId) sub.andWhere('l.id = :lid');
      if (query.communeId) sub.andWhere('a.commune_id = :cid');
      qb.andWhere(`EXISTS (${sub.getQuery()})`, {
        lid: query.localiteId,
        cid: query.communeId,
      });
    }
    return toPage(
      await whereNomLike(qb, 'r', query.q).getManyAndCount(),
      query,
    );
  }

  async findOne(id: number) {
    const rue = await this.repo.findOne({
      where: { id },
      relations: { localites: true },
    });
    if (!rue) throw new NotFoundException(`Rue ${id} introuvable`);
    const communes = await this.communes
      .createQueryBuilder('c')
      .innerJoin('arrondissement', 'a', 'a.commune_id = c.id')
      .innerJoin('localite', 'l', 'l.arrondissement_id = a.id')
      .innerJoin('rue_localite', 'rl', 'rl.localite_id = l.id')
      .where('rl.rue_id = :id', { id })
      .distinct(true)
      .orderBy('c.nom')
      .getMany();
    return { ...rue, communes };
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'geom', 'Rue');
  }
}

@ApiTags('Rues')
@Controller('rues')
export class RuesController {
  constructor(private readonly service: RuesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des rues (filtrable par localité, commune, type, nom)',
  })
  findAll(@Query() query: RuesQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Détail d’une rue avec ses localités et les communes traversées (déduites)',
  })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: 'Tracé de la rue (Feature GeoJSON)' })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Rue, Commune])],
  controllers: [RuesController],
  providers: [RuesService],
})
export class RuesModule {}
