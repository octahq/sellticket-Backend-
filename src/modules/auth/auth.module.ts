// auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomAuthSigner } from './custom-auth.signer';
import { KeyStoreService } from './keystore.service';
import { AccountFactory } from './account.factory';

/**
 * Authentication module configuration
 */
@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot(),
    
    // Email transport configuration
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('EMAIL_HOST'),
          port: config.get('EMAIL_PORT', 587),
          secure: false,
          auth: {
            user: config.get('EMAIL_USER'),
            pass: config.get('EMAIL_PASSWORD')
          }
        }
      }),
      inject: [ConfigService]
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    KeyStoreService,
    CustomAuthSigner,
    AccountFactory
  ]
})
export class AuthModule {}