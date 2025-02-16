import { Injectable, ForbiddenException } from '@nestjs/common';
import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition, generatePrivateKey } from 'viem';
import { Authorization } from 'viem/experimental';
import { LocalAccountSigner } from '@aa-sdk/core';
import { SmartAccountSigner, AuthDetails, AuthParams } from './types';
import { KeyStoreService } from './keystore.service';

@Injectable()
export class CustomAuthSigner implements SmartAccountSigner {
  signerType = 'CustomEmailSigner';
  inner: any;
  
  private currentAuthDetails: AuthDetails | null = null;

  constructor(private keyStoreService: KeyStoreService) {}

  // Method to get private key by email
  async getPrivateKeyForEmail(email: string): Promise<string | null> {
    const keys = this.keyStoreService.getKeys(email);
    return keys ? keys.privateKey : null;
  }

  // Generate new signer with new private key
  generateSigner() {
    const privateKey = generatePrivateKey();
    this.inner = LocalAccountSigner.privateKeyToAccountSigner(privateKey);
    return {
      privateKey
    };
  }

  // Set up existing signer with stored private key
  useSigner(privateKey: string) {
    this.inner = LocalAccountSigner.privateKeyToAccountSigner(privateKey);
  }

  async authenticate(params: AuthParams): Promise<AuthDetails> {
    const keys = this.keyStoreService.getKeys(params.email);
    if (!keys) throw new ForbiddenException('Authentication failed');

    this.useSigner(keys.privateKey);

    this.currentAuthDetails = {
      email: params.email,
      walletAddress: await this.getAddress() as Address,
      sessionKeyAddress: keys.sessionKeyAddress as Address,
      timestamp: Date.now()
    };

    return this.currentAuthDetails;
  }

  async getAddress(): Promise<Address> {
    if (!this.inner) throw new ForbiddenException('Not authenticated');
    return this.inner.getAddress();
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    if (!this.inner) throw new ForbiddenException('Not authenticated');
    return this.inner.signMessage(message);
  }

  async signTypedData<TTypedData extends TypedData, TPrimaryType extends keyof TTypedData>(
    params: TypedDataDefinition<TTypedData, TPrimaryType>
  ): Promise<Hex> {
    if (!this.inner) throw new ForbiddenException('Not authenticated');
    return this.inner.signTypedData(params);
  }

  async signAuthorization(
    unsignedAuthorization: Authorization<number, false>
  ): Promise<Authorization<number, true>> {
    if (!this.inner) throw new ForbiddenException('Not authenticated');
    return this.inner.signAuthorization(unsignedAuthorization);
  }

  private async getAuthDetails(): Promise<AuthDetails> {
    if (!this.currentAuthDetails) throw new ForbiddenException('Not authenticated');
    return this.currentAuthDetails;
  }
} 