import { User } from 'src/modules/auth/entities/auth.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity()
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  privateKey: string;

  @Column({ default: 0 })
  balance: number;

  @Column({ default: 'ETH' })
  currency: string;

  @ManyToOne(() => User, (user) => user.wallets)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
