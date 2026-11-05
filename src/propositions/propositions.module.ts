import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Repository } from 'typeorm';
import { StatutProposition } from '../common/enums.js';
import { PaginationQuery, toPage } from '../common/pagination.js';
import { Rue } from '../rues/rue.entity.js';
import { PropositionNomRue } from './proposition-nom-rue.entity.js';

export class CreatePropositionDto {
  @ApiProperty({ maxLength: 200, example: 'Rue Béhanzin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nomPropose: string;

  @ApiProperty({ example: 'Hommage au roi du Danxomè' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  justification: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  auteurNom: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Email ou téléphone, jamais affiché publiquement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  auteurContact?: string;
}

export class PropositionsQuery extends PaginationQuery {
  @ApiPropertyOptional({
    enum: StatutProposition,
    enumName: 'StatutProposition',
  })
  @IsOptional()
  @IsEnum(StatutProposition)
  statut?: StatutProposition;
}

@Injectable()
export class PropositionsService {
  constructor(
    @InjectRepository(PropositionNomRue)
    private readonly repo: Repository<PropositionNomRue>,
    @InjectRepository(Rue) private readonly rues: Repository<Rue>,
  ) {}

  private async ensureRue(rueId: number) {
    if (!(await this.rues.existsBy({ id: rueId }))) {
      throw new NotFoundException(`Rue ${rueId} introuvable`);
    }
  }

  async findForRue(rueId: number, query: PropositionsQuery) {
    await this.ensureRue(rueId);
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.rueId = :rueId', { rueId })
      .orderBy('p.dateProposition', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (query.statut) qb.andWhere('p.statut = :s', { s: query.statut });
    return toPage(await qb.getManyAndCount(), query);
  }

  async create(rueId: number, dto: CreatePropositionDto) {
    await this.ensureRue(rueId);
    const saved = await this.repo.save(
      this.repo.create({ ...dto, rueId, statut: StatutProposition.EN_ATTENTE }),
    );
    delete saved.auteurContact;
    return saved;
  }
}

@ApiTags('Propositions de nom de rue')
@Controller('rues/:rueId/propositions')
export class PropositionsController {
  constructor(private readonly service: PropositionsService) {}

  @Get()
  @ApiOperation({ summary: 'Propositions de nom pour une rue' })
  findAll(
    @Param('rueId', ParseIntPipe) rueId: number,
    @Query() query: PropositionsQuery,
  ) {
    return this.service.findForRue(rueId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Proposer un nom pour une rue (sans compte)',
    description:
      'La proposition est créée au statut EN_ATTENTE et sera validée ou rejetée par un administrateur.',
  })
  @ApiCreatedResponse({ type: PropositionNomRue })
  create(
    @Param('rueId', ParseIntPipe) rueId: number,
    @Body() dto: CreatePropositionDto,
  ) {
    return this.service.create(rueId, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PropositionNomRue, Rue])],
  controllers: [PropositionsController],
  providers: [PropositionsService],
})
export class PropositionsModule {}
