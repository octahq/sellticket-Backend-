import { Injectable } from '@nestjs/common';
import { 
  createModularAccountAlchemyClient, 
  SessionKeyPlugin, 
  sessionKeyPluginActions, 
  SessionKeyPermissionsBuilder, 
  SessionKeyAccessListType,
  SessionKeySigner
} from '@account-kit/smart-contracts';
import { sepolia, alchemy } from '@account-kit/infra';
import { zeroHash } from 'viem';
import { CustomAuthSigner } from './custom-auth.signer';

@Injectable()
export class AccountClientFactory {
  constructor(private readonly authSigner: CustomAuthSigner) {}

  async createClient(email: string) {
    const client = await createModularAccountAlchemyClient({
      chain: sepolia,
      transport: alchemy({ apiKey: process.env.ALCHEMY_API_KEY }),
      signer: this.authSigner,
      mode: 'default'
    });

    const extendedClient = client.extend(sessionKeyPluginActions);

    const isPluginInstalled = await extendedClient.getInstalledPlugins({})
      .then(plugins => plugins.includes(SessionKeyPlugin.meta.addresses[sepolia.id]));

    if (!isPluginInstalled) {
      await this.installSessionKeyPlugin(extendedClient);
    }

    return extendedClient;
  }

  private async installSessionKeyPlugin(client: any) {
    const permissions = new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({ spendLimit: 1000000n })
      .setContractAccessControlType(SessionKeyAccessListType.ALLOW_ALL_ACCESS)
      .setTimeRange({
        validFrom: Math.round(Date.now() / 1000),
        validUntil: Math.round(Date.now() / 1000 + 3600)
      });

    const { hash } = await client.installSessionKeyPlugin({
      args: [
        [await this.authSigner.getAddress()],
        [zeroHash],
        [permissions.encode()]
      ],
    });

    await client.waitForUserOperationTransaction({ hash });
  }
} 