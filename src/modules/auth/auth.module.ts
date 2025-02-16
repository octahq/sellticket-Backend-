import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { SessionKeysController } from './session-keys.controller';
import { AuthService } from './auth.service';
import { KeyStoreService } from './keystore.service';
import { CustomAuthSigner } from './custom-auth.signer';
import { AccountClientFactory } from './account-client.factory';
import { SessionManager } from './session.manager';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: '1h'  // Match session key expiration
        },
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    })
  ],
  controllers: [AuthController, SessionKeysController],
  providers: [
    AuthService,
    KeyStoreService,
    CustomAuthSigner,
    SessionManager,
    AccountClientFactory
  ],
  exports: [CustomAuthSigner, AuthService],
})
export class AuthModule {} 