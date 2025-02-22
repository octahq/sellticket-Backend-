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
import { CustomAuthSigner } from '../../common/utils/custom-signer';
import { Session } from './entities/session.entity';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Session]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: '24h' // Increased from 1h for better user experience
        },
      }),
    }),
  ],
  controllers: [AuthController, SessionController],
  providers: [
    AuthService,
    SessionService,
    MailService,
    AlchemyAAService,
    EncryptionService,
    CustomAuthSigner,
    {
      provide: 'ENCRYPTION_KEY',
      useFactory: (configService: ConfigService) => {
        return configService.get('ENCRYPTION_KEY') || 'default-encryption-key-32-chars-here!!';
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}