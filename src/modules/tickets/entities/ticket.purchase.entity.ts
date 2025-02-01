import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

export enum PurchaseStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('ticket_purchases')
export class TicketPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    default: PurchaseStatus.PENDING,
  })
  status: PurchaseStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePaid: number | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerFirstName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyerLastName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  additionalInfo: Record<string, any> | null;

  @ManyToOne(() => Ticket, (ticket) => ticket.purchases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  ticketId: string;

  //   @ManyToOne(() => User, (user) => user.ticketPurchases)
  //   @JoinColumn({ name: 'userId' })
  //   user: User;

  //   @Column({ type: 'uuid' })
  //   userId: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
