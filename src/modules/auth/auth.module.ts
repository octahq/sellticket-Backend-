import { Module } from '@nestjs/common';
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { MailService } from '../../common/utils/email'
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/auth.entity'
import { JwtModule } from '@nestjs/jwt';
import { AlchemyAAService } from '../../common/utils/alchemy'
import { EncryptionService } from 'src/common/utils/encryption.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  providers: [AuthService, MailService, AlchemyAAService, EncryptionService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
