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
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Commune } from '../communes/commune.entity.js';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { whereNomLike } from '../common/search.js';
import { Departement } from './departement.entity.js';

@Injectable()
export class DepartementsService {
  constructor(
    @InjectRepository(Departement)
    private readonly repo: Repository<Departement>,
    @InjectRepository(Commune) private readonly communes: Repository<Commune>,
  ) {}

  findAll(q?: string) {
    return whereNomLike(this.repo.createQueryBuilder('d'), 'd', q)
      .orderBy('d.nom')
      .getMany();
  }

  async findOne(id: number) {
    const d = await this.repo.findOne({
      where: { id },
      relations: { chefLieu: true },
    });
    if (!d) throw new NotFoundException(`Département ${id} introuvable`);
    return d;
  }

  async homologue(id: number) {
    const d = await this.findOne(id);
    const h = await this.repo.findOne({
      where: { groupe: d.groupe, id: Not(id) },
    });
    if (!h)
      throw new NotFoundException(`Aucun homologue pour le département ${id}`);
    return h;
  }

  async communesOf(id: number, query: PaginationQuery) {
    await this.findOne(id);
    const qb = this.communes
      .createQueryBuilder('c')
      .where('c.departementId = :id', { id })
      .orderBy('c.nom')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    return toPage(
      await whereNomLike(qb, 'c', query.q).getManyAndCount(),
      query,
    );
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'geom', 'Département');
  }
}

@ApiTags('Départements')
@Controller('departements')
export class DepartementsController {
  constructor(private readonly service: DepartementsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des 12 départements' })
  @ApiOkResponse({ type: [Departement] })
  findAll(@Query() query: PaginationQuery) {
    return this.service.findAll(query.q);
  }

  @Get(':id')
  @ApiOkResponse({ type: Departement })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/homologue')
  @ApiOperation({
    summary: 'Département homologue (même groupe, ex. Atlantique ↔ Littoral)',
  })
  @ApiOkResponse({ type: Departement })
  homologue(@Param('id', ParseIntPipe) id: number) {
    return this.service.homologue(id);
  }

  @Get(':id/communes')
  @ApiOperation({ summary: 'Communes du département' })
  communes(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQuery,
  ) {
    return this.service.communesOf(id, query);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: 'Contour du département (Feature GeoJSON)' })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Departement, Commune])],
  controllers: [DepartementsController],
  providers: [DepartementsService],
})
export class DepartementsModule {}
