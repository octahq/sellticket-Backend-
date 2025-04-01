// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/auth.entity';
import { MailModule } from '../../common/utils/email.module';
import { AlchemyModule } from '../../common/utils/alchemy.module';
import { CustomSignerModule } from '../../common/utils/custom-signer.module';
import { EncryptionModule } from '../../common/utils/encryption.module';
import { WalletModule } from '../wallet/wallet.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
    MailModule,
    AlchemyModule,
    CustomSignerModule,
    EncryptionModule,
    WalletModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
