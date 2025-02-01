import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { TicketStatus, TicketType, TokenGatingType } from '../enums';
import { TicketResale } from './ticket.resale.entity';
import { TicketPurchase } from './ticket.purchase.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', default: TicketType.FREE })
  type: TicketType;

  @Column({ type: 'varchar', nullable: true })
  tokenGatingType: TokenGatingType | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractAddress: string | null;

  @Column({ type: 'int', nullable: true })
  purchaseLimit: number | null;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamp', nullable: true })
  bookingStartTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  bookingEndTime: Date | null;

  @Column({ type: 'boolean', default: false })
  isResaleEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxResellPrice: number | null;

  @Column({ type: 'boolean', default: false })
  isApprovalRequired: boolean;

  @Column({ type: 'boolean', default: false })
  isGroupTicket: boolean;

  @Column({ type: 'int', nullable: true })
  groupSize: number | null;

  @Column({ type: 'varchar', default: TicketStatus.AVAILABLE })
  status: TicketStatus;

  @ManyToOne(() => Event, (event) => event.tickets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'number' })
  eventId: number;

  @OneToMany(() => TicketPurchase, (purchase) => purchase.ticket, {
    nullable: true,
  })
  purchases: TicketPurchase[];

  @OneToMany(() => TicketResale, (resale) => resale.ticket, { nullable: true })
  resales: TicketResale[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
