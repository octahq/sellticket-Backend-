// account.factory.ts
import { Injectable } from '@nestjs/common';
import { createModularAccountAlchemyClient, alchemy } from '@alchemy/aa-core';
import { sessionKeyPluginActions, SessionKeyPlugin, SessionKeyPermissionsBuilder } from '@account-kit/smart-contracts';
import { CustomAuthSigner } from './custom-auth.signer';
import { ConfigService } from '@nestjs/config';

/**
 * Factory for creating Alchemy Account clients with session management
 */
@Injectable()
export class AccountFactory {
  constructor(
    private config: ConfigService,
    private authSigner: CustomAuthSigner
  ) {}

  /**
   * Create authenticated Alchemy client
   * @param email - User's email address
   * @returns Promise<any> - Configured Alchemy client
   */
  async createClient(email: string) {
    // Ensure authentication
    await this.authSigner.getAddress();
    
    // Create base client
    const client = await createModularAccountAlchemyClient({
      chain: this.config.get('CHAIN_NETWORK', 'sepolia'),
      transport: alchemy(this.config.get('ALCHEMY_KEY')),
      signer: this.authSigner
    });

    return this.extendWithSessionSupport(client);
  }

  /**
   * Extend client with session key support
   * @param client - Base Alchemy client
   * @returns Promise<any> - Extended client
   */
  private async extendWithSessionSupport(client: any) {
    const extendedClient = client.extend(sessionKeyPluginActions);
    
    // Install plugin if not present
    if (!await this.isPluginInstalled(extendedClient)) {
      await this.installSessionPlugin(extendedClient);
    }

    return extendedClient;
  }

  /**
   * Check if session key plugin is installed
   * @param client - Alchemy client
   * @returns Promise<boolean> - Installation status
   */
  private async isPluginInstalled(client: any): Promise<boolean> {
    const plugins = await client.getInstalledPlugins();
    return plugins.includes(SessionKeyPlugin.meta.addresses[client.chain.id]);
  }

  /**
   * Install session key plugin
   * @param client - Alchemy client
   */
  private async installSessionPlugin(client: any) {
    const sessionSigner = await this.authSigner.createSessionKey();
    
    // Define default permissions
    const permissions = new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: BigInt(1_000_000) })
      .encode();

    // Execute plugin installation
    const { hash } = await client.installSessionKeyPlugin({
      args: [
        [await sessionSigner.getAddress()],
        ['0x'], // Empty tag array
        [permissions]
      ]
    });
    
    await client.waitForUserOperationTransaction({ hash });
  }
}