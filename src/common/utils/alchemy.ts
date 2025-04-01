import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomAuthSigner } from './custom-signer';

@Injectable()
export class AlchemyAAService {
  private modules: {
    createModularAccountV2Client?: any;
    sessionKeyPluginActions?: any;
    sepolia?: any;
    alchemy?: any;
  } = {};

  constructor(
    private configService: ConfigService,
    private authSigner: CustomAuthSigner
  ) {}

  private async loadModules() {
    if (!this.modules.createModularAccountV2Client) {
      const [
        { createModularAccountV2Client, sessionKeyPluginActions },
        { sepolia, alchemy }
      ] = await Promise.all([
        import('@account-kit/smart-contracts'),
        import('@account-kit/infra')
      ]);

      this.modules = { createModularAccountV2Client, sessionKeyPluginActions, sepolia, alchemy };
    }
    return this.modules;
  }

  async getAuthenticatedClient() {
    try {
      const address = await this.authSigner.getAddress();
      const { createModularAccountV2Client, sessionKeyPluginActions, sepolia, alchemy } = await this.loadModules();

      return (await createModularAccountV2Client({
        chain: sepolia,
        transport: alchemy(this.configService.get('ALCHEMY_API_KEY')),
        signer: this.authSigner,
        accountAddress: address
      })).extend(sessionKeyPluginActions);
    } catch (error) {
      throw new Error(`Failed to create AA client: ${error.message}`);
    }
  }
}