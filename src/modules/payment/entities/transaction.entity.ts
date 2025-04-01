import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gatewayReference: string;

  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse: any;

  @Column({
    type: 'varchar',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @ManyToOne(() => Payment, (payment) => payment.transactions)
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
