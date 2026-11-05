import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import type { MultiPolygon, Point } from 'geojson';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Arrondissement } from '../arrondissements/arrondissement.entity.js';
import { TypeLocalite } from '../common/enums.js';
import { geometryColumn } from '../common/geo.js';
import { Rue } from '../rues/rue.entity.js';

@Entity('localite')
@Index(['arrondissementId', 'nom'], { unique: true })
export class Localite {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ length: 150 })
  nom: string;

  /** Nullable tant que la source ne distingue pas villages et quartiers. */
  @ApiPropertyOptional({
    enum: TypeLocalite,
    enumName: 'TypeLocalite',
    nullable: true,
  })
  @Column({
    type: 'enum',
    enum: TypeLocalite,
    enumName: 'type_localite',
    nullable: true,
  })
  type: TypeLocalite | null;

  @ApiProperty()
  @Index()
  @Column({ name: 'arrondissement_id' })
  arrondissementId: number;

  @ApiHideProperty()
  @ManyToOne(() => Arrondissement, (a) => a.localites, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'arrondissement_id' })
  arrondissement?: Relation<Arrondissement>;

  @ApiHideProperty()
  @ManyToMany(() => Rue, (r) => r.localites)
  rues?: Relation<Rue>[];

  @ApiHideProperty()
  @Column(geometryColumn('MultiPolygon'))
  geom?: MultiPolygon | null;

  @ApiHideProperty()
  @Column(geometryColumn('Point'))
  centre?: Point | null;
}
