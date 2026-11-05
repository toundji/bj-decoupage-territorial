import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import type { Point, Polygon } from 'geojson';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { UsageBatiment } from '../common/enums.js';
import { geometryColumn } from '../common/geo.js';
import { Localite } from '../localites/localite.entity.js';
import { Rue } from '../rues/rue.entity.js';

@Entity('batiment')
@Index(['rueId', 'numero'], { unique: true })
export class Batiment {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '12B' })
  @Column({ length: 20 })
  numero: string;

  @ApiProperty({ enum: UsageBatiment, enumName: 'UsageBatiment' })
  @Column({
    type: 'enum',
    enum: UsageBatiment,
    enumName: 'usage_batiment',
    default: UsageBatiment.AUTRE,
  })
  usage: UsageBatiment;

  @ApiProperty()
  @Index()
  @Column({ name: 'rue_id' })
  rueId: number;

  @ApiHideProperty()
  @ManyToOne(() => Rue, (r) => r.batiments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rue_id' })
  rue?: Relation<Rue>;

  @ApiProperty()
  @Index()
  @Column({ name: 'localite_id' })
  localiteId: number;

  @ApiHideProperty()
  @ManyToOne(() => Localite, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'localite_id' })
  localite?: Relation<Localite>;

  @ApiHideProperty()
  @Column(geometryColumn('Point'))
  position?: Point | null;

  @ApiHideProperty()
  @Column(geometryColumn('Polygon'))
  emprise?: Polygon | null;
}
