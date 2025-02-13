import { Entity, PrimaryColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Table {
  @PrimaryColumn()
  number: number;

  @ManyToOne(() => User, (user) => user.tables, { nullable: true })
  owner: User;
}
