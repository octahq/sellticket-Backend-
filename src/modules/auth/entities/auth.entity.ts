import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ type: 'text', nullable: true }) // Encrypted private key
  encryptedPrivateKey?: string;

  @Column({ type: 'text', nullable: true }) // Encrypted private key
  encryptedMmemonic?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

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
    if (!this.otp) return false;
    return bcrypt.compare(plainOtp, this.otp);
  }
}
