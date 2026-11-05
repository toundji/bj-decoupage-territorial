import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import type { MultiLineString } from 'geojson';
import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Batiment } from '../batiments/batiment.entity.js';
import { TypeRue } from '../common/enums.js';
import { geometryColumn } from '../common/geo.js';
import { Localite } from '../localites/localite.entity.js';
import { PropositionNomRue } from '../propositions/proposition-nom-rue.entity.js';

/**
 * Une rue n'appartient à aucune commune : elle est liée aux localités
 * qu'elle traverse (table rue_localite). Les communes sont déduites.
 */
@Entity('rue')
export class Rue {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Index()
  @Column({ type: 'varchar', length: 200, nullable: true })
  nom: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'RNIE1' })
  @Index({ unique: true, where: 'code IS NOT NULL' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  code: string | null;

  @ApiProperty({ enum: TypeRue, enumName: 'TypeRue' })
  @Column({
    type: 'enum',
    enum: TypeRue,
    enumName: 'type_rue',
    default: TypeRue.RUE,
  })
  type: TypeRue;

  @ApiHideProperty()
  @ManyToMany(() => Localite, (l) => l.rues)
  @JoinTable({
    name: 'rue_localite',
    joinColumn: { name: 'rue_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'localite_id', referencedColumnName: 'id' },
  })
  localites?: Relation<Localite>[];

  @ApiHideProperty()
  @OneToMany(() => Batiment, (b) => b.rue)
  batiments?: Relation<Batiment>[];

  @ApiHideProperty()
  @OneToMany(() => PropositionNomRue, (p) => p.rue)
  propositions?: Relation<PropositionNomRue>[];

  @ApiHideProperty()
  @Column(geometryColumn('MultiLineString'))
  geom?: MultiLineString | null;
}
