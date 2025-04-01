// src/auth/entities/auth.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, OneToMany } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Session } from './session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ type: 'text', nullable: true })
  encryptedMnemonic?: string;

  @Column({ nullable: true })
  otp?: string;

  @Column({ nullable: true })
  otpExpiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Session, session => session.user)
  sessions: Session[];

  @BeforeInsert()
  async hashOtp() {
    if (this.otp) {
      this.otp = await bcrypt.hash(this.otp, 10);
    }
  }

  async validateOtp(plainOtp: string): Promise<boolean> {
    return this.otp ? bcrypt.compare(plainOtp, this.otp) : false;
  }
}