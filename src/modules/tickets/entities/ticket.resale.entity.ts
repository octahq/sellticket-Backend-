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
import { ResaleStatus } from '../enums';

@Entity('ticket_resales')
export class TicketResale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: ResaleStatus.LISTED })
  status: ResaleStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  resalePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commission: number | null;

  @ManyToOne(() => Ticket, (ticket) => ticket.resales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  ticketId: string;

  @Column({ type: 'timestamp', nullable: true })
  soldAt?: Date;

  //   @ManyToOne(() => User, (user) => user.ticketResales)
  //   @JoinColumn({ name: 'sellerId' })
  //   seller: User;

  //   @Column({ type: 'uuid' })
  //   sellerId: string;

  //   @ManyToOne(() => User, { nullable: true })
  //   @JoinColumn({ name: 'buyerId' })
  //   buyer: User | null;

  //   @Column({ type: 'uuid', nullable: true })
  //   buyerId: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
