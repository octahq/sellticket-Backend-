import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../../category/entities/category.entity';

export enum LocationType {
    Undisclosed = 'undisclosed',
    Physical = 'physical',
    Virtual = 'virtual'
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column('text') // Longer description
  description: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ default: 'UTC' }) // Default to UTC if no timezone is provided
  timeZone: string;

  @Column({ nullable: true }) // Event image URL
  imageUrl?: string;

  @ManyToOne(() => Category, (category) => category.id, { eager: true }) 
  category: Category; 

  @Column({ nullable: true }) // Custom checkout field (if needed)
  additionalInfo?: string;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.Undisclosed })
  locationType: LocationType;

  @Column({ nullable: true }) // Store physical address or meeting link
  location?: string;

  @Column({ default: false }) // ✅ New field: Does the guest pay the event fees?
  guestPaysFees: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
