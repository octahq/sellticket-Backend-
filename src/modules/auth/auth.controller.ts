import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VerifyOtpDto } from './dto/validate-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Request OTP for authentication' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: AuthResponseDto,
  })
  @ApiBody({ type: RequestOtpDto })
  @Post('request-otp')
  async requestOtp(
    @Body() requestOtpDto: RequestOtpDto,
  ): Promise<AuthResponseDto> {
    return this.authService.generateOtp(requestOtpDto.email);
  }

  @ApiOperation({ summary: 'Verify OTP and authenticate user' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(verifyOtpDto.email, verifyOtpDto.otp);
  }
}
