import { Injectable } from '@nestjs/common';
import { SessionKeySigner } from '@account-kit/smart-contracts';
import { CustomAuthSigner } from './custom-auth.signer';
import { ConfigService } from '@nestjs/config';
import { KeyStoreService } from './keystore.service';
import { createModularAccountAlchemyClient, alchemy } from '@alchemy/aa-core';
import { sessionKeyPluginActions } from '@alchemy/aa-session-key';

@Injectable()
export class AccountClientFactory {
  constructor(
    private readonly authSigner: CustomAuthSigner,
    private readonly configService: ConfigService,
    private readonly keyStoreService: KeyStoreService
  ) {}

  async setupAuthSigner(email: string) {
    // First try to get existing private key
    let privateKey = await this.authSigner.getPrivateKeyForEmail(email);

    if (!privateKey) {
      // No key found - generate new signer and save to keystore
      console.log('No existing key found - generating new signer for:', email);
      const { privateKey: newKey } = this.authSigner.generateSigner();
      
      // Save to keystore mapped to email
      await this.keyStoreService.storeKeys(email, {
        privateKey: newKey,
        walletAddress: await this.authSigner.getAddress(),
        accountAddress: null,
        sessionKeyData: null,
        sessionKeyAddress: null,
        permissions: {}
      });
      
      privateKey = newKey;
    } else {
      // Use existing key
      this.authSigner.useSigner(privateKey);
    }

    return this.authSigner;
  }

  async createSessionKey() {
    const sessionKeySigner = new SessionKeySigner();
    return sessionKeySigner;
  }

  async createClient(email: string) {
    // Set up the auth signer for this email
    const signer = await this.setupAuthSigner(email);

    // Create the client with the configured signer
    const client = await createModularAccountAlchemyClient({
      chain: this.chain,
      transport: alchemy({ apiKey: process.env.ALCHEMY_API_KEY }),
      signer,
    });

    const extendedClient = client.extend(sessionKeyPluginActions);

    // ... rest of the code ...
  }
} 