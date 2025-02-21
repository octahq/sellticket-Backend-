import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 256-bit key
  private readonly IV_LENGTH = 16; // AES block size

  constructor() {
    if (!this.ENCRYPTION_KEY) {
      throw new Error("Missing ENCRYPTION_KEY in environment variables.");
    }
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.ENCRYPTION_KEY, "hex"),
      iv
    );
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [iv, encrypted] = encryptedData.split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.ENCRYPTION_KEY, "hex"),
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
