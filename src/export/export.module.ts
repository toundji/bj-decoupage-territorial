import { Controller, Get, Header, Module } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildSnapshot } from './snapshot.js';

@ApiTags('Export')
@Controller('export')
export class ExportController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Instantané complet du découpage (départements → localités)',
    description:
      'JSON compact : pour chaque table, `champs` (noms des colonnes) et `lignes` (valeurs). ' +
      'Même format que public/data/decoupage.json. La page d’exploration s’en sert ' +
      'pour générer les exports JSON et SQL.',
  })
  @ApiOkResponse({ description: 'Instantané compact' })
  @Header('Cache-Control', 'public, max-age=300')
  snapshot() {
    return buildSnapshot(this.ds);
  }
}

@Module({ controllers: [ExportController] })
export class ExportModule {}
