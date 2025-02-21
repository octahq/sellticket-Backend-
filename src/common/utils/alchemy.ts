// src/common/utils/alchemy-aa.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomAuthSigner } from './custom-auth.signer';
import { createModularAccountV2Client } from '@account-kit/smart-contracts';
import { sepolia, alchemy } from '@account-kit/infra';

@Injectable()
export class AlchemyAAService {
  constructor(
    private configService: ConfigService,
    private authSigner: CustomAuthSigner
  ) {}

  async getAuthenticatedClient() {
    const address = await this.authSigner.getAddress();
    
    return createModularAccountV2Client({
      mode: 'default',
      chain: sepolia,
      transport: alchemy(this.configService.get('ALCHEMY_API_KEY')),
      signer: this.authSigner,
      accountAddress: address
    });
  }
}