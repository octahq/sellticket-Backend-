// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './entities/auth.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailService } from '../../common/utils/email';
import { AlchemyAAService } from '../../common/utils/alchemy';
import { EncryptionService } from '../../common/utils/encryption.service';
import { CustomAuthSigner } from '../../common/utils/custom-auth.signer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }
      }),
    }),
  ],
  providers: [
    AuthService,
    MailService,
    AlchemyAAService,
    EncryptionService,
    CustomAuthSigner
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}