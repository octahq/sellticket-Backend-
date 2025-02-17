// auth.service.ts
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { KeyStoreService } from './keystore.service';

/**
 * Service handling authentication business logic
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly keystore: KeyStoreService,
    private readonly mailer: MailerService
  ) {}

  /**
   * Initiate OTP flow for a user
   * @param email - User's email address
   * @returns Promise<void>
   */
  async initiateOTP(email: string): Promise<void> {
    const session = this.keystore.initializeSession(email);
    
    // Send OTP via email
    await this.mailer.sendMail({
      to: email,
      subject: 'Your Login OTP',
      text: `Your OTP code is ${session.otp.code}`
    });
  }
}