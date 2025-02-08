import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Transaction } from './transaction.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reference: string;

  @Column()
  amount: number;

  @Column()
  currency: string;

  @Column()
  email: string;

  @Column({
    type: 'varchar',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @OneToMany(() => Transaction, (transaction) => transaction.payment)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
