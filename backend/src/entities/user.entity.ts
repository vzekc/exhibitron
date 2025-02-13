import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Table } from './table.entity';
import { Exhibition } from './exhibition.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ nullable: true })
  password_reset_key: string;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_key_expires_at: Date;

  @Column({ default: false })
  is_administrator: boolean;

  @OneToMany(() => Table, (table) => table.owner)
  tables: Table[];

  @OneToMany(() => Exhibition, (exhibition) => exhibition.exhibitor)
  exhibitions: Exhibition[];
}
