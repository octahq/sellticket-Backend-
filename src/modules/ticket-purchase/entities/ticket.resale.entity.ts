import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { ResaleStatus } from '../enums';

@Entity('ticket_resales')
export class TicketResale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { eager: true })
  ticket: Ticket;

  @Column('decimal', { precision: 10, scale: 2 })
  resalePrice: number;

  @Column({
    type: 'enum',
    enum: ResaleStatus,
    default: ResaleStatus.LISTED,
  })
  status: ResaleStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
