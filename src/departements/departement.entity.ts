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
import { GroupeDepartement } from '../common/enums.js';
import { geometryColumn } from '../common/geo.js';
import { Commune } from '../communes/commune.entity.js';

@Entity('departement')
export class Departement {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'AQ', description: 'Code ISO 3166-2:BJ' })
  @Index({ unique: true })
  @Column({ length: 10 })
  code: string;

  @ApiProperty({ example: 'ATLANTIQUE' })
  @Index({ unique: true })
  @Column({ length: 100 })
  nom: string;

  @ApiProperty({ enum: GroupeDepartement, enumName: 'GroupeDepartement' })
  @Index()
  @Column({
    type: 'enum',
    enum: GroupeDepartement,
    enumName: 'groupe_departement',
  })
  groupe: GroupeDepartement;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Commune chef-lieu',
  })
  @Column({ name: 'chef_lieu_id', type: 'int', nullable: true })
  chefLieuId: number | null;

  @ApiHideProperty()
  @ManyToOne(() => Commune, {
    nullable: true,
    onDelete: 'SET NULL',
    createForeignKeyConstraints: true,
  })
  @JoinColumn({ name: 'chef_lieu_id' })
  chefLieu?: Relation<Commune> | null;

  @ApiHideProperty()
  @OneToMany(() => Commune, (c) => c.departement)
  communes?: Relation<Commune>[];

  @ApiHideProperty()
  @Column(geometryColumn('MultiPolygon'))
  geom?: MultiPolygon | null;
}
