import { SupabaseClient } from '@supabase/supabase-js';
import { createError } from '../middleware/errorHandler';

export interface VaultKey {
  id: string;
  keyName: string;
  service: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
}

export interface StoreKeyRequest {
  keyName: string;
  service: string;
  value: string;
  environment?: string;
}

export class VaultService {
  // TODO: Simple encryption for MVP (use proper encryption in production)
  private encrypt(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  private decrypt(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }

  async storeKey(
    userId: string, 
    request: StoreKeyRequest, 
    supabase: SupabaseClient
  ): Promise<VaultKey> {
    const { keyName, service, value, environment = 'production' } = request;

    // Encrypt the value
    const encryptedValue = this.encrypt(value);

    const { data, error } = await supabase
      .from('vault_keys')
      .insert({
        user_id: userId,
        key_name: keyName,
        service: service,
        encrypted_value: encryptedValue,
        environment: environment
      })
      .select('id, key_name, service, environment, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw createError('Key name already exists for this environment', 409);
      }
      throw createError(`Failed to store key: ${error.message}`, 500);
    }

    return {
      id: data.id,
      keyName: data.key_name,
      service: data.service,
      environment: data.environment,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async getUserKeys(
    userId: string, 
    environment: string = 'production', 
    supabase: SupabaseClient
  ): Promise<VaultKey[]> {
    const { data, error } = await supabase
      .from('vault_keys')
      .select('id, key_name, service, environment, created_at, updated_at, last_accessed')
      .eq('user_id', userId)
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError(`Failed to fetch keys: ${error.message}`, 500);
    }

    return (data || []).map(item => ({
      id: item.id,
      keyName: item.key_name,
      service: item.service,
      environment: item.environment,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      lastAccessed: item.last_accessed
    }));
  }

  async getKeyValue(
    userId: string, 
    keyName: string, 
    environment: string = 'production', 
    supabase: SupabaseClient
  ): Promise<{ value: string; service: string }> {
    // Get the encrypted value
    const { data, error } = await supabase
      .from('vault_keys')
      .select('encrypted_value, service')
      .eq('user_id', userId)
      .eq('key_name', keyName)
      .eq('environment', environment)
      .single();

    if (error || !data) {
      throw createError('Key not found', 404);
    }

    // Update last accessed timestamp
    await supabase
      .from('vault_keys')
      .update({ last_accessed: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('key_name', keyName)
      .eq('environment', environment);

    // Decrypt and return
    const decryptedValue = this.decrypt(data.encrypted_value);

    return {
      value: decryptedValue,
      service: data.service
    };
  }

  async deleteKey(
    userId: string, 
    keyName: string, 
    environment: string = 'production', 
    supabase: SupabaseClient
  ): Promise<void> {
    const { error } = await supabase
      .from('vault_keys')
      .delete()
      .eq('user_id', userId)
      .eq('key_name', keyName)
      .eq('environment', environment);

    if (error) {
      throw createError(`Failed to delete key: ${error.message}`, 500);
    }
  }
}