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
import { Arrondissement } from '../arrondissements/arrondissement.entity.js';
import { StatutCommune } from '../common/enums.js';
import { geometryColumn } from '../common/geo.js';
import { Departement } from '../departements/departement.entity.js';

@Entity('commune')
@Index(['departementId', 'nom'], { unique: true })
export class Commune {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Index({ unique: true, where: 'code IS NOT NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @ApiProperty({ example: 'COTONOU' })
  @Column({ length: 100 })
  nom: string;

  @ApiProperty({ enum: StatutCommune, enumName: 'StatutCommune' })
  @Column({
    type: 'enum',
    enum: StatutCommune,
    enumName: 'statut_commune',
    default: StatutCommune.ORDINAIRE,
  })
  statut: StatutCommune;

  @ApiProperty()
  @Index()
  @Column({ name: 'departement_id' })
  departementId: number;

  @ApiHideProperty()
  @ManyToOne(() => Departement, (d) => d.communes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departement_id' })
  departement?: Relation<Departement>;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Arrondissement chef-lieu',
  })
  @Column({ name: 'chef_lieu_id', type: 'int', nullable: true })
  chefLieuId: number | null;

  @ApiHideProperty()
  @ManyToOne(() => Arrondissement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chef_lieu_id' })
  chefLieu?: Relation<Arrondissement> | null;

  @ApiHideProperty()
  @OneToMany(() => Arrondissement, (a) => a.commune)
  arrondissements?: Relation<Arrondissement>[];

  @ApiHideProperty()
  @Column(geometryColumn('MultiPolygon'))
  geom?: MultiPolygon | null;
}
