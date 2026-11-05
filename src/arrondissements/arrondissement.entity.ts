import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import type { MultiPolygon } from 'geojson';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { geometryColumn } from '../common/geo.js';
import { Commune } from '../communes/commune.entity.js';
import { Localite } from '../localites/localite.entity.js';

@Entity('arrondissement')
@Index(['communeId', 'nom'], { unique: true })
export class Arrondissement {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Index({ unique: true, where: 'code IS NOT NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @ApiProperty()
  @Column({ length: 150 })
  nom: string;

  @ApiProperty()
  @Index()
  @Column({ name: 'commune_id' })
  communeId: number;

  @ApiHideProperty()
  @ManyToOne(() => Commune, (c) => c.arrondissements, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'commune_id' })
  commune?: Relation<Commune>;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Localité chef-lieu',
  })
  @Column({ name: 'chef_lieu_id', type: 'int', nullable: true })
  chefLieuId: number | null;

  @ApiHideProperty()
  @ManyToOne(() => Localite, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chef_lieu_id' })
  chefLieu?: Relation<Localite> | null;

  @ApiHideProperty()
  @OneToMany(() => Localite, (l) => l.arrondissement)
  localites?: Relation<Localite>[];

  @ApiHideProperty()
  @Column(geometryColumn('MultiPolygon'))
  geom?: MultiPolygon | null;
}
