import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Table } from './table.entity';

@Entity()
export class Exhibition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.exhibitions)
  exhibitor: User;

  @Column()
  title: string;

  @Column({ default: '' })
  description: string;

  @ManyToOne(() => Table, { nullable: true })
  table_number: Table;
}
