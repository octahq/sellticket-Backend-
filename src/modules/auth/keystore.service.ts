import { Injectable } from '@nestjs/common';
import { KeyStoreData } from './types';

@Injectable()
export class KeyStoreService {
  private keyStore: Map<string, KeyStoreData> = new Map();

  storeKeys(email: string, keys: Omit<KeyStoreData, 'permissions'> & { permissions?: Record<string, boolean> }) {
    this.keyStore.set(email, { 
      ...keys,
      permissions: keys.permissions || {}
    });
  }

  getKeys(email: string) {
    return this.keyStore.get(email);
  }

  updateSessionKey(email: string, sessionPrivateKey: string, sessionKeyAddress: string) {
    const existing = this.keyStore.get(email);
    if (existing) {
      this.keyStore.set(email, { 
        ...existing, 
        sessionPrivateKey,
        sessionKeyAddress 
      });
    }
  }

  updatePermissions(email: string, permissions: Record<string, boolean>) {
    const existing = this.keyStore.get(email);
    if (existing) {
      this.keyStore.set(email, {
        ...existing,
        permissions: { ...existing.permissions, ...permissions }
      });
    }
  }

  removeKeys(email: string) {
    this.keyStore.delete(email);
  }
} 