// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/auth.entity';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../common/utils/email';
import { AlchemyAAService } from '../../common/utils/alchemy';
import { CustomAuthSigner } from '../../common/utils/custom-signer';
import { EncryptionService } from 'src/common/utils/encryption.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mailService: MailService,
    private alchemyAAService: AlchemyAAService,
    private authSigner: CustomAuthSigner,
    private encryptionService: EncryptionService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async generateOtp(email: string) {
    try {
      let user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        console.log('Creating new user with wallet...');
        try {
          // Generate new wallet
          const { mnemonic, address } = await this.authSigner.generateNewWallet();
          
          // Encrypt mnemonic
          const encryptedMnemonic = this.encryptionService.encrypt(mnemonic);
          
          console.log('Wallet generated:', { 
            address,
            hasMnemonic: !!encryptedMnemonic 
          });

          // Create and save user
          user = this.userRepository.create({
            email,
            walletAddress: address,
            encryptedMnemonic: encryptedMnemonic // Make sure this matches the entity property
          });

          await this.userRepository.save(user);
          
          console.log('User saved with wallet:', {
            id: user.id,
            email: user.email,
            hasWallet: !!user.walletAddress,
            hasMnemonic: !!user.encryptedMnemonic
          });
        } catch (walletError) {
          console.error('Failed to create wallet:', walletError);
          throw new Error('Failed to create wallet');
        }
      } else {
        console.log('Existing user found:', {
          id: user.id,
          email: user.email,
          hasWallet: !!user.walletAddress,
          hasMnemonic: !!user.encryptedMnemonic
        });
      }

      // Generate and save OTP
      const otpLength = parseInt(process.env.OTP_LENGTH || '4');
      const { randomDigits: code } = this.generateOtpCode({
        numberOfDigits: otpLength,
      });

      const otpExpiresAt = new Date(
        Date.now() + parseInt(process.env.OTP_EXPIRATION_MS || '300000'),
      );

      await this.userRepository.update(user.id, {
        otp: await bcrypt.hash(code, 10),
        otpExpiresAt,
      });

      // Send OTP email
      await this.mailService
        .sendMail(email, 'Your OTP Code', {
          text: `Your OTP code is: ${code}. It will expire in ${process.env.OTP_EXPIRATION_MINUTES || 5} minutes.`,
        })
        .catch(error => console.error('Failed to send email:', error));

      return { message: 'OTP sent successfully.' };
    } catch (error) {
      console.error('Error in generateOtp:', error);
      throw new Error('Failed to generate OTP: ' + error.message);
    }
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.userRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'otp', 'otpExpiresAt', 'encryptedMnemonic', 'walletAddress']
    });

    if (!user || !user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired or invalid.');
    }

    if (!(await bcrypt.compare(otp, user.otp))) {
      throw new UnauthorizedException('Incorrect OTP.');
    }

    await this.userRepository.update(user.id, { otp: null, otpExpiresAt: null });
    
    // Initialize the auth signer with decrypted mnemonic
    const walletAddress = await this.authSigner.initialize(user);

    // Verify wallet address matches stored address
    if (walletAddress !== user.walletAddress) {
      throw new UnauthorizedException('Wallet address mismatch');
    }

    const payload = { 
      email: user.email,
      walletAddress: user.walletAddress,
      userId: user.id
    };
    
    return {
      message: 'Authentication successful',
      token: this.jwtService.sign(payload)
    };
  }

  private generateOtpCode = ({ numberOfDigits }: { numberOfDigits: number }) => {
    const min = 10 ** (numberOfDigits - 1);
    const max = (10 ** numberOfDigits) - 1;
    return { randomDigits: String(Math.floor(min + Math.random() * (max - min + 1))) };
  };
}