import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('ticket_resale_history')
export class TicketResaleHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.resaleHistory)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'previous_owner_id' })
  previousOwnerId: string;

  @Column({ name: 'new_owner_id' })
  newOwnerId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  resalePrice: number;

  @CreateDateColumn({ name: 'resale_date' })
  resaleDate: Date;
}
