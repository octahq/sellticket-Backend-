import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { Address } from 'viem';
import { KeyStoreService } from './keystore.service';
import { CustomAuthSigner } from './custom-auth.signer';
import { AccountClientFactory } from './account-client.factory';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; timestamp: number }> = new Map();

  constructor(
    private keyStoreService: KeyStoreService,
    private mailerService: MailerService,
    private authSigner: CustomAuthSigner,
    private jwtService: JwtService,
    private accountClientFactory: AccountClientFactory
  ) {}

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
    
    if (Date.now() - storedData.timestamp > 300000) { // 5 minutes
      throw new UnauthorizedException('OTP expired');
    }

    let isNewUser = false;
    let walletAddress: Address;
    let accountAddress: string;

    // Check if user exists
    const existingKeys = this.keyStoreService.getKeys(email);

    if (!existingKeys) {
      // New user - generate new private key using CustomAuthSigner
      isNewUser = true;
      const { privateKey } = this.authSigner.generatePrivateKeyAndSigner();
      walletAddress = await this.authSigner.getAddress();

      // Create modular account using the CustomAuthSigner
      console.log(`Creating modular account for new user: ${email}`);
      const client = await this.accountClientFactory.createClient(email);
      accountAddress = client.getAddress({ account: client.account });
      console.log(`Modular account created: ${accountAddress}`);

      // Update stored keys with account address
      await this.keyStoreService.updateKeys(email, {
        accountAddress
      });

      console.log(`New user wallet and account created: ${walletAddress}`);
    } else {
      // Existing user - set up signer with stored private key
      console.log(`Setting up signer for existing user: ${email}`);
      // setupup the signer with the email and save as the signer
      await this.accountClientFactory.setupAuthSigner(email);
      //To do: get the address of the wallet
      //To do: setup the signer with the email
     
      console.log(`Existing user signer initialized: ${walletAddress}`);
    }

    this.otpStore.delete(email);

    // Generate JWT token
    const token = this.generateAuthToken({
      email,
      walletAddress,
      accountAddress,
      timestamp: Date.now()
    });

    return {
      walletAddress,
      accountAddress,
      isNewUser,
      message: isNewUser ? 'New wallet and account generated successfully' : 'Authenticated successfully',
      token
    };
  }

  private generateAuthToken(payload: any) {
    return this.jwtService.sign(payload, {
      expiresIn: '1h',
      subject: payload.email,
      issuer: 'sellticket-auth'
    });
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
} 