// src/auth/entities/auth.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ type: 'text', nullable: true })
  encryptedMmemonic?: string;

  @Column({ nullable: true })
  otp?: string;

  @Column({ nullable: true })
  otpExpiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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