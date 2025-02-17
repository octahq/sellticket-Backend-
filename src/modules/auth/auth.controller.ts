// auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomAuthSigner } from './custom-auth.signer';
import { AccountFactory } from './account.factory';

/**
 * Authentication controller handling HTTP endpoints
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authSigner: CustomAuthSigner,
    private readonly accountFactory: AccountFactory
  ) {}

  /**
   * Initiate OTP flow endpoint
   * @param email - User's email address
   * @returns Promise<{ status: string }>
   */
  @Post('initiate')
  async initiate(@Body('email') email: string) {
    await this.authService.initiateOTP(email);
    return { status: 'OTP sent' };
  }

  /**
   * Verify OTP and return session details
   * @param body - { email: string, otp: string }
   * @returns Promise<{ success: boolean, walletAddress: Address, sessionKeys: SessionKey[] }>
   */
  @Post('verify')
  async verify(@Body() { email, otp }: { email: string; otp: string }) {
    await this.authSigner.authenticate({ email, otp });
    const client = await this.accountFactory.createClient(email);
    return {
      success: true,
      walletAddress: await this.authSigner.getAddress(),
      sessionKeys: (await this.authSigner.getAuthDetails()).sessionKeys
    };
  }
}