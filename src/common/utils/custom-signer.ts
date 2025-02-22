import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';
import { EncryptionService } from './encryption.service';
import { User } from '../../modules/auth/entities/auth.entity';
import { generateMnemonic } from 'viem/accounts';
import { wordlists } from 'bip39';
import type { SmartAccountSigner } from "@aa-sdk/core" with { "resolution-mode": "import" };

@Injectable()
export class CustomAuthSigner {
  readonly signerType = "SecureSigner";
  private _inner: SmartAccountSigner | null = null;
  public currentUser: User | null = null;

  get inner() {
    return this._inner;
  }

  constructor(private encryptionService: EncryptionService) {}

  private async loadSigner() {
    const { LocalAccountSigner } = await import('@aa-sdk/core'); // Only dynamically import concrete classes
    return { LocalAccountSigner };
  }

  async generateNewWallet(): Promise<{ mnemonic: string; address: Address }> {
    const { LocalAccountSigner } = await this.loadSigner();
    const mnemonic = generateMnemonic(wordlists.english, 128);
    const signer = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
    const address = await signer.getAddress();
    return { mnemonic, address };
  }

  async initialize(user: User): Promise<Address> {
    if (!user.encryptedMnemonic) {
      throw new UnauthorizedException('No cryptographic material found');
    }

    try {
      const { LocalAccountSigner } = await this.loadSigner();
      const mnemonic = this.encryptionService.decrypt(user.encryptedMnemonic);
      this._inner = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
      this.currentUser = user;
      return await this.getAddress();
    } catch (error) {
      throw new UnauthorizedException('Failed to initialize signer');
    }
  }

  async getAddress(): Promise<Address> {
    this.validateReady();
    return this.inner!.getAddress();
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    this.validateReady();
    return this.inner!.signMessage(message);
  }

  async signTypedData<TTypedData extends TypedData, TPrimaryType extends keyof TTypedData>(
    params: TypedDataDefinition<TTypedData, TPrimaryType>
  ): Promise<Hex> {
    this.validateReady();
    return this.inner!.signTypedData(params);
  }

  private validateReady(): void {
    if (!this.inner || !this.currentUser) {
      throw new UnauthorizedException('Complete OTP authentication first');
    }
  }
}