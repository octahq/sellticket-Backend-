// src/common/utils/custom-auth.signer.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';
import { LocalAccountSigner, SmartAccountSigner } from '@aa-sdk/core';
import { EncryptionService } from './encryption.service';
import { User } from '../../auth/entities/auth.entity';
import { generateMnemonic } from 'viem/accounts';

@Injectable()
export class CustomAuthSigner implements SmartAccountSigner {
  readonly signerType = "SecureSigner";
  private inner: ReturnType<typeof LocalAccountSigner.mnemonicToAccountSigner> | null = null;
  private currentUser: User | null = null;

  constructor(private encryptionService: EncryptionService) {}

  async generateNewWallet(): Promise<{ mnemonic: string; address: Address }> {
    const mnemonic = generateMnemonic();
    const signer = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
    const address = await signer.getAddress();
    return { mnemonic, address };
  }

  async initialize(user: User): Promise<Address> {
    if (!user.encryptedMmemonic) {
      throw new UnauthorizedException('No cryptographic material found');
    }
    
    try {
      const mnemonic = this.encryptionService.decrypt(user.encryptedMmemonic);
      this.inner = LocalAccountSigner.mnemonicToAccountSigner(mnemonic);
      this.currentUser = user;
      return this.getAddress();
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