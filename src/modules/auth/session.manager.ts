import { Injectable } from '@nestjs/common';
import { SessionKeySigner } from '@account-kit/smart-contracts';
import { 
  SessionKeyPermissionsBuilder, 
  SessionKeyAccessListType 
} from '@account-kit/smart-contracts';
import { SmartAccountSigner } from '@aa-sdk/core';
import { zeroHash } from 'viem';

@Injectable()
export class SessionManager {
  // Generate new session key using the CustomAuthSigner
  generateSessionKey(signer: SmartAccountSigner) {
    console.log('Generating new session key');
    const sessionKeySigner = new SessionKeySigner();
    const sessionKeyData = sessionKeySigner.export();
    const sessionAddress = sessionKeySigner.getAddress();
    console.log(`Generated session key address: ${sessionAddress}`);
    
    return {
      sessionKeyData,
      sessionKeyAddress: sessionAddress,
      sessionSigner: sessionKeySigner
    };
  }

  // Create session key permissions
  createSessionKeyPermissions(validUntil: number) {
    return new SessionKeyPermissionsBuilder()
      .setNativeTokenSpendLimit({
        spendLimit: 1000000n
      })
      .setContractAccessControlType(SessionKeyAccessListType.ALLOW_ALL_ACCESS)
      .setTimeRange({
        validFrom: Math.round(Date.now() / 1000),
        validUntil
      });
  }

  // Create session key installation args
  async createSessionKeyInstallArgs(signer: SmartAccountSigner) {
    const sessionKey = this.generateSessionKey(signer);
    const permissions = this.createSessionKeyPermissions(
      Math.round(Date.now() / 1000 + 3600) // 1 hour from now
    );
    
    return {
      sessionKeyData: sessionKey.sessionKeyData,
      sessionKeyAddress: sessionKey.sessionKeyAddress,
      args: [
        [await sessionKey.sessionSigner.getAddress()],
        [zeroHash],
        [permissions.encode()]
      ]
    };
  }

  // Initialize session key with stored data
  async initializeSessionKey(sessionKeyData: any): Promise<SessionKeySigner> {
    const sessionKeySigner = new SessionKeySigner();
    await sessionKeySigner.init(sessionKeyData);
    return sessionKeySigner;
  }
}