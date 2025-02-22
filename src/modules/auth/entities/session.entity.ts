// src/auth/entities/session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './auth.entity';

/**
 * Entity representing a user session with permissions
 */
@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sessionKey: string;

  @Column({ type: 'jsonb' })
  permissions: {
    spendLimit: string;
    validUntil: Date;
    contractAllowList: string[];
  };

  @ManyToOne(() => User, user => user.sessions)
  user: User;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}