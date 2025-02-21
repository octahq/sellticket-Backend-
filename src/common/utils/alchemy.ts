import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service.js';

@Injectable()
export class AlchemyAAService {
  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Creates a Smart Contract Wallet (SCW) for a new user.
   * Uses a 12-word mnemonic instead of a raw private key.
   * Encrypts the mnemonic for storage.
   * @returns The SCW address and encrypted mnemonic phrase.
   */
  async createSmartWallet(): Promise<{ address: string; encryptedMnemonic: string }> {
    try {
      // ✅ Fix for ESM modules in CommonJS mode
      const smartContractsModule = await import('@account-kit/smart-contracts');
      const { createModularAccountV2Client } = smartContractsModule;

      const aaSdkModule = await import('@aa-sdk/core');
      const { LocalAccountSigner } = aaSdkModule;

      const infraModule = await import('@account-kit/infra');
      const { sepolia, alchemy } = infraModule;

      const viemModule = await import('viem/accounts');
      const { generateMnemonic } = viemModule;

      const bip39 = await import('bip39');

      // ✅ Generate 12-word mnemonic
      const mnemonic = generateMnemonic(bip39.wordlists.english);
      console.log(mnemonic)

      // ✅ Create an account signer from the mnemonic
      const signer = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);

      // ✅ Create Smart Contract Wallet client
      const accountClient = await createModularAccountV2Client({
        mode: 'default',
        chain: sepolia,
        transport: alchemy({
          apiKey: this.configService.get<string>('ALCHEMY_API_KEY'),
        }),
        signer,
      });

      // ✅ Get the wallet address
      const smartWalletAddress = await accountClient.getAddress({
        account: accountClient.account,
      });

      // 🔒 Encrypt the mnemonic before storing it
      const encryptedMnemonic = this.encryptionService.encrypt(mnemonic);

      return { address: smartWalletAddress, encryptedMnemonic };
    } catch (error) {
      console.error('Error creating Smart Contract Wallet:', error);
      throw new Error('Failed to create Smart Contract Wallet.');
    }
  }
}
