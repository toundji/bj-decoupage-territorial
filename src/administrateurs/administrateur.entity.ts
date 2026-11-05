import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('administrateur')
export class Administrateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nom: string;

  @Index({ unique: true })
  @Column({ length: 200 })
  email: string;

  /** Hash (bcrypt/argon2), jamais le mot de passe en clair. */
  @Column({ name: 'mot_de_passe', length: 255, select: false })
  motDePasse: string;

  @CreateDateColumn({ name: 'cree_le', type: 'timestamptz' })
  creeLe: Date;
}
