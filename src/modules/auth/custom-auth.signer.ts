// custom-auth.signer.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';
import { Authorization } from 'viem/experimental';
import { LocalAccountSigner, SmartAccountAuthenticator } from '@aa-sdk/core';
import { SessionKeySigner } from '@account-kit/smart-contracts';
import { KeyStoreService } from './keystore.service';
import { AuthParams, AuthDetails, AuthSession } from './types';

/**
 * Custom authentication signer implementing Alchemy's SmartAccountAuthenticator
 * Handles:
 * - OTP verification
 * - Mnemonic-based signer initialization
 * - Session key management
 */
@Injectable()
export class CustomAuthSigner implements SmartAccountAuthenticator<AuthParams, AuthDetails> {
  // Signer type identifier
  readonly signerType = 'EmailOTPSigner';
  
  // Inner signer instance (mnemonic-based)
  private inner = LocalAccountSigner.mnemonicToAccountSigner('');
  
  // Current active session
  private currentSession?: AuthSession;
  
  // Active session key signer
  private sessionSigner?: SessionKeySigner;

  constructor(private readonly keystore: KeyStoreService) {}

  /**
   * Authenticate user with email and OTP
   * @param params - AuthParams containing email and OTP
   * @returns Promise<AuthDetails> - Authentication details
   * @throws UnauthorizedException - Invalid or expired OTP
   */
  async authenticate(params: AuthParams): Promise<AuthDetails> {
    const session = this.keystore.getSession(params.email);
    
    // Validate OTP presence and match
    if (!session?.otp || session.otp.code !== params.otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Check OTP expiration
    if (Date.now() > session.otp.expiresAt) {
      throw new UnauthorizedException('OTP expired');
    }

    this.currentSession = session;
    
    // Initialize mnemonic-based signer
    this.inner = LocalAccountSigner.mnemonicToAccountSigner(session.mnemonic);

    // Set wallet address if new user
    if (!session.walletAddress) {
      const address = await this.inner.getAddress();
      this.keystore.updateWalletAddress(params.email, address);
    }

    return this.getAuthDetails();
  }

  /**
   * Get current authentication details
   * @returns Promise<AuthDetails> - Current session details
   * @throws UnauthorizedException - If not authenticated
   */
  async getAuthDetails(): Promise<AuthDetails> {
    if (!this.currentSession) throw new UnauthorizedException('Not authenticated');
    
    return {
      email: this.currentSession.email,
      walletAddress: this.currentSession.walletAddress,
      sessionKeys: this.currentSession.sessionKeys,
      authenticatedAt: Date.now()
    };
  }

  // Below methods implement the SmartAccountSigner interface

  /**
   * Get wallet address from current signer
   * @returns Promise<Address> - Wallet address
   */
  async getAddress(): Promise<Address> {
    this.validateAuth();
    return this.inner.getAddress();
  }

  /**
   * Sign arbitrary message
   * @param message - Message to sign
   * @returns Promise<Hex> - Signature hex string
   */
  async signMessage(message: SignableMessage): Promise<Hex> {
    this.validateAuth();
    return this.inner.signMessage(message);
  }

  /**
   * Sign typed data (EIP-712)
   * @param params - Typed data definition
   * @returns Promise<Hex> - Signature hex string
   */
  async signTypedData<TTypedData extends TypedData, TPrimaryType extends keyof TTypedData>(
    params: TypedDataDefinition<TTypedData, TPrimaryType>
  ): Promise<Hex> {
    this.validateAuth();
    return this.inner.signTypedData(params);
  }

  /**
   * Sign authorization (experimental)
   * @param unsignedAuthorization - Authorization data
   * @returns Promise<Authorization> - Signed authorization
   */
  async signAuthorization(
    unsignedAuthorization: Authorization<number, false>
  ): Promise<Authorization<number, true>> {
    this.validateAuth();
    return this.inner.signAuthorization(unsignedAuthorization);
  }

  /**
   * Create new session key with default permissions
   * @returns Promise<SessionKeySigner> - New session key signer
   */
  async createSessionKey(): Promise<SessionKeySigner> {
    this.validateAuth();
    this.sessionSigner = new SessionKeySigner();
    
    // Store session key with default permissions
    this.keystore.addSessionKey(this.currentSession.email, {
      address: await this.sessionSigner.getAddress(),
      permissions: '0x', // Default permissions
      validUntil: Date.now() + 3600000 // 1 hour expiration
    });

    return this.sessionSigner;
  }

  /**
   * Validate current authentication state
   * @throws UnauthorizedException - If not authenticated
   */
  private validateAuth() {
    if (!this.currentSession || !this.inner) {
      throw new UnauthorizedException('Authentication required');
    }
  }
}