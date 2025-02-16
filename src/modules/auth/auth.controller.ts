import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KeyStoreService } from './keystore.service';
import { CustomAuthSigner } from './custom-auth.signer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly keyStoreService: KeyStoreService,
    private readonly authSigner: CustomAuthSigner
  ) {}

  @Post('initiate-otp')
  async initiateOTP(@Body('email') email: string) {
    return this.authService.initiateEmailOTP(email);
  }

  @Post('verify-otp')
  async verifyOTP(@Body('email') email: string, @Body('otp') otp: string) {
    const result = await this.authService.verifyOTP(email, otp);
    return { 
      sessionKeyAddress: result.sessionKeyAddress,
      walletAddress: result.walletAddress 
    };
  }

  @Get('session/:email')
  getSession(@Param('email') email: string) {
    const keys = this.keyStoreService.getKeys(email);
    if (!keys) throw new Error('Session not found');
    return {
      sessionKeyAddress: keys.sessionKeyAddress,
      walletAddress: keys.walletAddress
    };
  }
} 