import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/auth.entity';
import * as bcrypt from 'bcryptjs';
import { Options, RandomAlphanumeric } from './interface/auth.interface';
import { MailService } from '../../common/utils/email';
import { AlchemyAAService } from 'src/common/utils/alchemy';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly alchemyAAService: AlchemyAAService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Generates a one-time password (OTP) for user authentication.
   * - If the user exists, updates the OTP; otherwise, creates a new user entry.
   * - OTP is hashed before storing for security.
   * - Sends OTP via email asynchronously.
   *
   * @param {string} email - The email address of the user requesting the OTP.
   * @returns {Promise<{ message: string }>} - A confirmation message.
   */
  async generateOtp(email: string) {
    try {
      let user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        const { address, encryptedMnemonic } =
          await this.alchemyAAService.createSmartWallet();
        user = this.userRepository.create({
          email,
          walletAddress: address,
          encryptedMmemonic: encryptedMnemonic,
        });
      }

      const otpLength = parseInt(process.env.OTP_LENGTH || '4');
      const { randomDigits: code } = this.generateOtpCode({
        numberOfDigits: otpLength,
      });

      // Hash OTP and set expiration time
      const otpExpiresAt = new Date(
        Date.now() + parseInt(process.env.OTP_EXPIRATION_MS || '300000'),
      );

      Object.assign(user, {
        otp: await bcrypt.hash(code, 10),
        otpExpiresAt,
      });

      await this.userRepository.save(user);

      // Send OTP via email asynchronously (non-blocking)
      this.mailService
        .sendMail(email, 'Your OTP Code', {
          text: `Your OTP code is: ${code}. It will expire in ${process.env.OTP_EXPIRATION_MINUTES || 5} minutes.`,
        })
        .catch((error) => console.error('Email sending failed:', error));

      return { message: 'OTP sent successfully.' };
    } catch (error) {
      console.error('Error in generateOtp:', error);
      throw new Error('Failed to generate OTP.');
    }
  }

  /**
   * Verifies the provided OTP for user authentication.
   * - Checks OTP expiration and validates OTP using bcrypt.
   * - If OTP is valid, generates a JWT token for authentication.
   * - OTP is removed from the database after successful verification.
   *
   * @param {string} email - The email address associated with the OTP.
   * @param {string} otp - The one-time password entered by the user.
   * @returns {Promise<{ message: string; token: string }>} - Success message and JWT token.
   * @throws {UnauthorizedException} - If OTP is invalid, expired, or brute-force attempts exceed limits.
   */
  async verifyOtp(email: string, otp: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        select: { id: true, email: true, otp: true, otpExpiresAt: true },
      });

      if (
        !user ||
        !user.otp ||
        !user.otpExpiresAt ||
        user.otpExpiresAt < new Date()
      ) {
        throw new UnauthorizedException('OTP expired or invalid.');
      }

      const isOtpValid = await bcrypt.compare(otp, user.otp);
      if (!isOtpValid) {
        throw new UnauthorizedException('Incorrect OTP.');
      }

      await this.userRepository.update(user.id, {
        otp: null,
        otpExpiresAt: null,
      });

      // Generate JWT Token
      const payload = { email: user.email, userId: user.id };
      const token = this.jwtService.sign(payload);

      return { message: 'Authentication successful', token };
    } catch (error) {
      console.error('Error in verifyOtp:', error);
      throw new UnauthorizedException('Authentication failed.');
    }
  }

  private generateOtpCode = (options: Options): RandomAlphanumeric => {
    const { numberOfDigits } = options;

    if (numberOfDigits <= 0) {
      throw new Error('Number of digits should be greater than 0.');
    }

    const generateRandomDigits = (count: number): string => {
      const min = Math.pow(10, count - 1);
      const max = Math.pow(10, count) - 1;
      return String(min + Math.floor(Math.random() * (max - min + 1)));
    };

    const randomDigits = generateRandomDigits(numberOfDigits);

    return { randomDigits };
  };
}
