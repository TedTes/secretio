import { createCipher, createDecipher, randomBytes, scryptSync, createHash } from 'crypto';

export class EncryptionService {
  private algorithm: string;
  private secretKey: Buffer;

  constructor() {
    this.algorithm = process.env.VAULT_ENCRYPTION_ALGORITHM || 'aes-256-gcm';
    
    const encryptionKey = process.env.VAULT_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('VAULT_ENCRYPTION_KEY environment variable is required');
    }
    
    // Ensure key is exactly 32 bytes for AES-256
    this.secretKey = scryptSync(encryptionKey, 'vault-salt', 32);
  }

  /**
   * Encrypt a string value using AES-256-GCM
   */
  encrypt(text: string): string {
    try {
      // Generate a random initialization vector
      const iv = randomBytes(16);
      
      // Create cipher
      const cipher = createCipher(this.algorithm, this.secretKey);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag (for GCM mode)
      const authTag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag() : Buffer.alloc(0);
      
      // Combine IV, auth tag, and encrypted data
      const result = {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptedData: encrypted
      };
      
      // Return as base64 encoded JSON for storage
      return Buffer.from(JSON.stringify(result)).toString('base64');
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt a string value using AES-256-GCM
   */
  decrypt(encryptedData: string): string {
    try {
      // Parse the encrypted data
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      const { iv, authTag, encryptedData: encrypted } = data;
      
      // Create decipher
      const decipher = createDecipher(this.algorithm, this.secretKey);
      
      // Set auth tag if available (for GCM mode)
      if (authTag && (decipher as any).setAuthTag) {
        (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));
      }
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Generate a secure random key for testing/setup
   */
  static generateSecureKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash a value for comparison without storing the original
   */
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Create a masked version of sensitive data for display
   */
  mask(value: string, visibleChars: number = 4): string {
    if (value.length <= visibleChars * 2) {
      return '*'.repeat(value.length);
    }
    
    const start = value.slice(0, visibleChars);
    const end = value.slice(-visibleChars);
    const middle = '*'.repeat(Math.max(0, value.length - (visibleChars * 2)));
    
    return `${start}${middle}${end}`;
  }
}


export const encryptionService = new EncryptionService();