// src/auth/dto/verify-otp.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '1234' })
  @IsNotEmpty()
  @Length(4, 4)
  otp: string;
}