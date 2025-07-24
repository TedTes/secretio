import { SupabaseClient } from '@supabase/supabase-js';
import { createError } from '../middleware/errorHandler';
import { encryptionService } from '../utils/encryption';
import { DatabaseService } from './database';
import {StoreKeyRequest 
} from "../types";
export interface VaultKey {
  id: string;
  keyName: string;
  service: string;
  environment: string;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
}


export class VaultService {
  
  /**
   * Store an API key with AES-256 encryption
   */
  async storeKey(
    userId: string, 
    request: StoreKeyRequest, 
    dbServiceInstance: DatabaseService
  ): Promise<VaultKey> {
    const { keyName, service, value, environment = 'production' } = request;

    try {
      // Validate input
      if (!value || value.trim().length === 0) {
        throw createError('API key value cannot be empty', 400);
      }

      if (value.length > 1000) {
        throw createError('API key value too long (max 1000 characters)', 400);
      }
      // Store in database
       const {data , error} = await dbServiceInstance.storeKey(userId,{keyName, service, value, environment})
      if (error) {
        if (error.code === '23505') {
          // Check if it's a duplicate key name or duplicate value
          if (error.message.includes('key_name')) {
            throw createError('A key with this name already exists for this environment', 409);
          } else if (error.message.includes('value_hash')) {
            throw createError('This API key value is already stored in your vault', 409);
          }
        }
        
        console.error('Database error storing vault key:', error);
        throw createError(`Failed to store key: ${error.message}`, 500);
      }

      console.log(`✅ API key stored securely for user ${userId}: ${keyName}`);

      return {
        id: data.id,
        keyName: data.key_name,
        service: data.service,
        environment: data.environment,
        maskedValue: data.masked_value,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

    } catch (error) {
      console.error('Vault key storage failed:', error);
      throw error instanceof Error ? error : createError('Failed to store key', 500);
    }
  }

  /**
   * Get user's vault keys (returns masked values for security)
   */
  async getUserKeys(
    userId: string, 
    environment: string = 'production', 
    dbServiceInstance: DatabaseService
  ): Promise<VaultKey[]> {
    try {
   
      const {data, error} = await dbServiceInstance.getUserKeys( userId, environment)
      if (error) {
        console.error('Database error getting vault keys:', error);
        throw createError(`Failed to fetch keys: ${error.message}`, 500);
      }

      return (data || []).map(item => ({
        id: item.id,
        keyName: item.key_name,
        service: item.service,
        environment: item.environment,
        maskedValue: item.masked_value,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        lastAccessed: item.last_accessed
      }));

    } catch (error) {
      console.error('Vault key retrieval failed:', error);
      throw error instanceof Error ? error : createError('Failed to retrieve keys', 500);
    }
  }

  /**
   * Get decrypted value of a specific key (for application use)
   */
  async getKeyValue(
    userId: string, 
    keyName: string, 
    environment: string = 'production', 
    dbServiceInstance: DatabaseService
  ): Promise<{ value: string; service: string }> {
    try {
  
      const { data, error } =  await dbServiceInstance.getKeyValue(userId, keyName,environment);
      if (error || !data) {
        if (error?.code === 'PGRST116') {
          throw createError('API key not found', 404);
        }
        throw createError(`Failed to retrieve key: ${error?.message}`, 500);
      }

      // Decrypt the value
      const decryptedValue = encryptionService.decrypt(data.encrypted_value);
      await dbServiceInstance.updateLastAccessedTimeStamp(data);
     

      console.log(`🔓 API key accessed for user ${userId}: ${keyName}`);

      return {
        value: decryptedValue,
        service: data.service
      };

    } catch (error) {
      console.error('Vault key access failed:', error);
      throw error instanceof Error ? error : createError('Failed to access key', 500);
    }
  }

  /**
   * Delete a key from the vault
   */
  async deleteKey(
    userId: string, 
    keyName: string, 
    environment: string = 'production', 
    dbServiceInstance: DatabaseService
  ): Promise<void> {
    try {
      const {error}  = await dbServiceInstance.deleteKey(userId, keyName, environment);


      if (error) {
        console.error('Database error deleting vault key:', error);
        throw createError(`Failed to delete key: ${error.message}`, 500);
      }

      console.log(`🗑️ API key deleted for user ${userId}: ${keyName}`);

    } catch (error) {
      console.error('Vault key deletion failed:', error);
      throw error instanceof Error ? error : createError('Failed to delete key', 500);
    }
  }

  /**
   * Rotate a key (update with new value)
   */
  async rotateKey(
    userId: string,
    keyName: string,
    newValue: string,
    environment: string = 'production',
    dbServiceInstance: DatabaseService
  ): Promise<VaultKey> {
    try {
    

  
      const {data, error} = await dbServiceInstance.rotateKey(userId, keyName, newValue, environment);
      if (error || !data) {
        throw createError(`Failed to rotate key: ${error?.message || 'Key not found'}`, 500);
      }

      console.log(`🔄 API key rotated for user ${userId}: ${keyName}`);

      return {
        id: data.id,
        keyName: data.key_name,
        service: data.service,
        environment: data.environment,
        maskedValue: data.masked_value,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

    } catch (error) {
      console.error('Vault key rotation failed:', error);
      throw error instanceof Error ? error : createError('Failed to rotate key', 500);
    }
  }

  /**
   * Test encryption/decryption functionality
   */
  async testEncryption(): Promise<{ success: boolean; message: string }> {
    try {
      const testValue = 'test-api-key-12345';
      const encrypted = encryptionService.encrypt(testValue);
      const decrypted = encryptionService.decrypt(encrypted);
      
      if (testValue === decrypted) {
        return { success: true, message: 'Encryption test passed' };
      } else {
        return { success: false, message: 'Encryption test failed: values do not match' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Encryption test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}