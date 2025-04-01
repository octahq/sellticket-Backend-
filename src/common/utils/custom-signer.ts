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

  constructor(private encryptionService: EncryptionService) {}

  private async loadSigner() {
    try {
      const { LocalAccountSigner } = await import('@aa-sdk/core');
      return { LocalAccountSigner };
    } catch (error) {
      console.error('Failed to load signer:', error);
      throw new UnauthorizedException('Failed to initialize signer');
    }
  }

  async generateNewWallet(): Promise<{ mnemonic: string; address: Address }> {
    try {
      const { LocalAccountSigner } = await this.loadSigner();
      const mnemonic = generateMnemonic(wordlists.english, 128);
      console.log('Generated mnemonic:', mnemonic); // Debug log
      
      const signer = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
      const address = await signer.getAddress();
      
      console.log('Generated wallet address:', address); // Debug log
      return { mnemonic, address };
    } catch (error) {
      console.error('Failed to generate wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  async initialize(user: User): Promise<Address> {
    console.log('Initializing signer for user:', user.email); // Debug log
    
    if (!user.encryptedMnemonic) {
      console.error('No encrypted mnemonic found for user:', user.email);
      throw new UnauthorizedException('No cryptographic material found');
    }

    try {
      const { LocalAccountSigner } = await this.loadSigner();
      
      console.log('Decrypting mnemonic...'); // Debug log
      const mnemonic = this.encryptionService.decrypt(user.encryptedMnemonic);
      console.log('Mnemonic decrypted successfully'); // Debug log
      
      this._inner = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
      this.currentUser = user;
      
      const address = await this.getAddress();
      console.log('Initialized wallet address:', address); // Debug log
      
      return address;
    } catch (error) {
      console.error('Failed to initialize signer:', error);
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

  get inner() {
    return this._inner;
  }
}