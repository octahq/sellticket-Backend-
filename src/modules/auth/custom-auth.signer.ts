import { Injectable, ForbiddenException } from '@nestjs/common';
import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition, hashMessage, hashTypedData, serializeAuthorization, toHex } from 'viem';
import { Authorization } from 'viem/experimental';
import { sign } from '@noble/ed25519';
import { SmartAccountSigner, AuthDetails, AuthParams } from './types';
import { KeyStoreService } from './keystore.service';

@Injectable()
export class CustomAuthSigner implements SmartAccountSigner {
  signerType = 'CustomEmailSigner';
  inner: any;
  
  private currentAuthDetails: AuthDetails | null = null;

  constructor(private keyStoreService: KeyStoreService) {}

  async authenticate(params: AuthParams): Promise<AuthDetails> {
    const keys = this.keyStoreService.getKeys(params.email);
    if (!keys) throw new ForbiddenException('Authentication failed');

    this.currentAuthDetails = {
      email: params.email,
      walletAddress: keys.walletAddress as Address,
      sessionKeyAddress: keys.sessionKeyAddress as Address,
      timestamp: Date.now()
    };

    return this.currentAuthDetails;
  }

  async getAddress(): Promise<Address> {
    const authDetails = await this.getAuthDetails();
    return authDetails.sessionKeyAddress;
  }

  async signMessage(message: SignableMessage): Promise<Hex> {
    const authDetails = await this.getAuthDetails();
    const keys = this.keyStoreService.getKeys(authDetails.email);
    if (!keys) throw new ForbiddenException('Session expired');

    const messageHash = hashMessage(message);
    const signature = await sign(messageHash, keys.sessionPrivateKey);
    return toHex(signature);
  }

  async signTypedData<TTypedData extends TypedData, TPrimaryType extends keyof TTypedData>(
    params: TypedDataDefinition<TTypedData, TPrimaryType>
  ): Promise<Hex> {
    const authDetails = await this.getAuthDetails();
    const keys = this.keyStoreService.getKeys(authDetails.email);
    if (!keys) throw new ForbiddenException('Session expired');

    const hash = hashTypedData(params);
    const signature = await sign(hash, keys.sessionPrivateKey);
    return toHex(signature);
  }

  async signAuthorization(
    unsignedAuthorization: Authorization<number, false>
  ): Promise<Authorization<number, true>> {
    const authDetails = await this.getAuthDetails();
    const keys = this.keyStoreService.getKeys(authDetails.email);
    if (!keys) throw new ForbiddenException('Session expired');

    const serialized = serializeAuthorization(unsignedAuthorization);
    const signature = await sign(serialized, keys.sessionPrivateKey);
    return { ...unsignedAuthorization, signature: toHex(signature) };
  }

  private async getAuthDetails(): Promise<AuthDetails> {
    if (!this.currentAuthDetails) throw new ForbiddenException('Not authenticated');
    return this.currentAuthDetails;
  }
} 