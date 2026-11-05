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
import { UsageBatiment } from '../common/enums.js';
import { loadFeature } from '../common/geo.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { Batiment } from './batiment.entity.js';

export class BatimentsQuery extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rueId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  localiteId?: number;

  @ApiPropertyOptional({ enum: UsageBatiment, enumName: 'UsageBatiment' })
  @IsOptional()
  @IsEnum(UsageBatiment)
  usage?: UsageBatiment;
}

@Injectable()
export class BatimentsService {
  constructor(
    @InjectRepository(Batiment) private readonly repo: Repository<Batiment>,
  ) {}

  async findAll(query: BatimentsQuery) {
    const qb = this.repo
      .createQueryBuilder('b')
      .orderBy('b.rueId')
      .addOrderBy('b.numero')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.rueId) qb.andWhere('b.rueId = :r', { r: query.rueId });
    if (query.localiteId)
      qb.andWhere('b.localiteId = :l', { l: query.localiteId });
    if (query.usage) qb.andWhere('b.usage = :u', { u: query.usage });
    if (query.q?.trim())
      qb.andWhere('b.numero ILIKE :q', { q: `%${query.q.trim()}%` });
    return toPage(await qb.getManyAndCount(), query);
  }

  async findOne(id: number) {
    const b = await this.repo.findOne({
      where: { id },
      relations: { rue: true, localite: true },
    });
    if (!b) throw new NotFoundException(`Bâtiment ${id} introuvable`);
    return b;
  }

  geometrie(id: number) {
    return loadFeature(this.repo, id, 'position', 'Bâtiment');
  }
}

@ApiTags('Bâtiments')
@Controller('batiments')
export class BatimentsController {
  constructor(private readonly service: BatimentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Liste paginée des bâtiments (filtrable par rue, localité, usage, numéro)',
  })
  findAll(@Query() query: BatimentsQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/geometrie')
  @ApiOperation({ summary: 'Position GPS du bâtiment (Feature GeoJSON)' })
  geometrie(@Param('id', ParseIntPipe) id: number) {
    return this.service.geometrie(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Batiment])],
  controllers: [BatimentsController],
  providers: [BatimentsService],
})
export class BatimentsModule {}
