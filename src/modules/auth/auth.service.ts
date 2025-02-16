import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem';
import { KeyStoreService } from './keystore.service';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; timestamp: number }> = new Map();

  constructor(
    private keyStoreService: KeyStoreService,
    private mailerService: MailerService
  ) {}

  generateSessionKey() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return {
      privateKey,
      address: account.address
    };
  }

  async initiateEmailOTP(email: string) {
    const otp = this.generateOTP();
    this.otpStore.set(email, { otp, timestamp: Date.now() });
    
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your Login OTP',
      text: `Your OTP code is ${otp}`
    });

    return { message: 'OTP sent successfully' };
  }

  async verifyOTP(email: string, otp: string) {
    const storedData = this.otpStore.get(email);
    
    if (!storedData || storedData.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }
    
    if (Date.now() - storedData.timestamp > 300000) {
      throw new UnauthorizedException('OTP expired');
    }

    let keys = this.keyStoreService.getKeys(email);
    if (!keys) {
      const ownerAccount = privateKeyToAccount(generatePrivateKey());
      const sessionKey = this.generateSessionKey();
      
      keys = {
        ownerPrivateKey: ownerAccount.privateKey,
        walletAddress: ownerAccount.address,
        sessionPrivateKey: sessionKey.privateKey,
        sessionKeyAddress: sessionKey.address,
        permissions: {}
      };
      
      this.keyStoreService.storeKeys(email, keys);
    }

    this.otpStore.delete(email);
    
    return {
      walletAddress: keys.walletAddress as Address,
      sessionKeyAddress: keys.sessionKeyAddress as Address
    };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
} 