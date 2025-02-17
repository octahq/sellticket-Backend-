// types.ts
/**
 * Type definitions for the authentication system
 */

// Represents an Ethereum address (0x-prefixed hex string)
export type Address = `0x${string}`;

// Represents a hexadecimal string (0x-prefixed)
export type Hex = `0x${string}`;

/**
 * Parameters required for authentication
 * @property {string} email - User's email address
 * @property {string} otp - One-time password for verification
 */
export interface AuthParams {
  email: string;
  otp: string;
}

/**
 * Details of an authenticated session
 * @property {string} email - Authenticated user's email
 * @property {Address} walletAddress - User's wallet address
 * @property {SessionKey[]} sessionKeys - Active session keys
 * @property {number} authenticatedAt - Timestamp of authentication
 */
export interface AuthDetails {
  email: string;
  walletAddress: Address;
  sessionKeys: SessionKey[];
  authenticatedAt: number;
}

/**
 * User session data structure
 * @property {string} email - User's email address
 * @property {string} mnemonic - Cryptographic mnemonic phrase
 * @property {Address} walletAddress - Derived wallet address
 * @property {SessionKey[]} sessionKeys - Active session keys
 * @property {object} [otp] - Optional OTP verification data
 */
export interface AuthSession {
  email: string;
  mnemonic: string;
  walletAddress: Address;
  sessionKeys: SessionKey[];
  otp?: {
    code: string;
    expiresAt: number;
  };
}

/**
 * Session key configuration
 * @property {Address} address - Session key address
 * @property {Hex} permissions - Encoded permissions bitmap
 * @property {number} validUntil - Expiration timestamp
 */
export interface SessionKey {
  address: Address;
  permissions: Hex;
  validUntil: number;
}