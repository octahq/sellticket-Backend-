import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { SessionKeysController } from './session-keys.controller';
import { AuthService } from './auth.service';
import { KeyStoreService } from './keystore.service';
import { CustomAuthSigner } from './custom-auth.signer';
import { AccountClientFactory } from './account-client.factory';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    AccountClientFactory
  ],
  exports: [CustomAuthSigner],
})
export class AuthModule {} 