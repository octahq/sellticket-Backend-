import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { PurchaseStatus } from '../enums';

@Entity('ticket_purchases')
export class TicketPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { eager: true })
  ticket: Ticket;

  @Column()
  quantity: number;

  @Column()
  buyerEmail: string;

  @Column()
  buyerFirstName: string;

  @Column()
  buyerLastName: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerWalletAddress: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionHash: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number | null;

  @Column({ type: 'jsonb', nullable: true })
  additionalInfo?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING,
  })
  status: PurchaseStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
