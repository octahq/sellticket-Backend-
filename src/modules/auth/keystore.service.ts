// keystore.service.ts
import { Injectable } from '@nestjs/common';
import { generateMnemonic } from 'viem/accounts';
import { AuthSession, SessionKey } from './types';

/**
 * Service for managing user sessions and cryptographic materials
 * Handles:
 * - Session storage
 * - OTP generation
 * - Mnemonic management
 * - Session key storage
 */
@Injectable()
export class KeyStoreService {
  // In-memory session storage (production should use persistent storage)
  private sessions: Map<string, AuthSession> = new Map();

  /**
   * Initialize or retrieve a user session
   * @param email - User's email address
   * @returns AuthSession - New or existing session
   */
  initializeSession(email: string): AuthSession {
    let session = this.sessions.get(email);

    if (!session) {
      // Generate new mnemonic for first-time users
      session = {
        email,
        mnemonic: generateMnemonic(),
        walletAddress: '' as Address,
        sessionKeys: [],
        otp: this.generateOTP()
      };
      this.sessions.set(email, session);
    } else {
      // Regenerate OTP for existing users
      session.otp = this.generateOTP();
    }

    return session;
  }

  /**
   * Retrieve a user session
   * @param email - User's email address
   * @returns AuthSession | undefined - Session data if exists
   */
  getSession(email: string): AuthSession | undefined {
    return this.sessions.get(email);
  }

  /**
   * Update wallet address in session
   * @param email - User's email address
   * @param address - Derived wallet address
   */
  updateWalletAddress(email: string, address: Address): void {
    const session = this.sessions.get(email);
    if (session) session.walletAddress = address;
  }

  /**
   * Add a session key to user's session
   * @param email - User's email address
   * @param key - Session key configuration
   */
  addSessionKey(email: string, key: SessionKey): void {
    const session = this.sessions.get(email);
    if (session) session.sessionKeys.push(key);
  }

  /**
   * Generate a new OTP with 5-minute expiration
   * @returns {code: string, expiresAt: number} - OTP data
   */
  private generateOTP() {
    return {
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      expiresAt: Date.now() + 300000 // 5 minutes
    };
  }
}