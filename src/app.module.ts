import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArrondissementsModule } from './arrondissements/arrondissements.module.js';
import { BatimentsModule } from './batiments/batiments.module.js';
import { CommunesModule } from './communes/communes.module.js';
import { dataSourceOptions } from './database/data-source.js';
import { DepartementsModule } from './departements/departements.module.js';
import { LocalitesModule } from './localites/localites.module.js';
import { PropositionsModule } from './propositions/propositions.module.js';
import { RuesModule } from './rues/rues.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ConfigModule a chargé .env dans process.env avant l'appel de la factory
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions(process.env),
    }),
    DepartementsModule,
    CommunesModule,
    ArrondissementsModule,
    LocalitesModule,
    RuesModule,
    PropositionsModule,
    BatimentsModule,
  ],
})
export class AppModule {}
