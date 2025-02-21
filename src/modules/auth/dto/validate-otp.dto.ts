import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '4');

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '1234', description: 'OTP received via email' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(OTP_LENGTH, OTP_LENGTH, { message: 'OTP must be exactly 4 digits' })
  otp: string;
}
