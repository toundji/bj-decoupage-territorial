import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Administrateur } from '../administrateurs/administrateur.entity.js';
import { StatutProposition } from '../common/enums.js';
import { Rue } from '../rues/rue.entity.js';

@Entity('proposition_nom_rue')
export class PropositionNomRue {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Index()
  @Column({ name: 'rue_id' })
  rueId: number;

  @ApiHideProperty()
  @ManyToOne(() => Rue, (r) => r.propositions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rue_id' })
  rue?: Relation<Rue>;

  @ApiProperty()
  @Column({ name: 'nom_propose', length: 200 })
  nomPropose: string;

  @ApiProperty()
  @Column({ type: 'text' })
  justification: string;

  @ApiProperty()
  @Column({ name: 'auteur_nom', length: 150 })
  auteurNom: string;

  /** Jamais exposé publiquement. */
  @ApiHideProperty()
  @Column({
    name: 'auteur_contact',
    type: 'varchar',
    length: 150,
    nullable: true,
    select: false,
  })
  auteurContact?: string | null;

  @ApiProperty({ enum: StatutProposition, enumName: 'StatutProposition' })
  @Index()
  @Column({
    type: 'enum',
    enum: StatutProposition,
    enumName: 'statut_proposition',
    default: StatutProposition.EN_ATTENTE,
  })
  statut: StatutProposition;

  @ApiProperty()
  @CreateDateColumn({ name: 'date_proposition', type: 'timestamptz' })
  dateProposition: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'date_decision', type: 'timestamptz', nullable: true })
  dateDecision: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'motif_decision', type: 'text', nullable: true })
  motifDecision: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Column({ name: 'decideur_id', type: 'int', nullable: true })
  decideurId: number | null;

  @ApiHideProperty()
  @ManyToOne(() => Administrateur, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decideur_id' })
  decideur?: Relation<Administrateur> | null;
}
