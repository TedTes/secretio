
export interface VaultClientOptions {
    baseUrl: string;
    token: string;
    environment?: string;
  }
  
  export interface VerifyResponse {
    available_keys: string[];
    count: number;
  }
export class VaultClient {
    private baseUrl: string;
    private token: string;
    private environment: string;
  
    constructor(options: VaultClientOptions) {
      this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
      this.token = options.token;
      this.environment = options.environment || 'production';
    }
  
    /**
     * Get a specific API key from the vault
     */
    async getKey(keyName: string): Promise<string> {
      try {
        const response = await fetch(
          `${this.baseUrl}/api/vault/retrieve/${keyName}?environment=${this.environment}`,
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
  
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Key '${keyName}' not found in vault`);
          }
          throw new Error(`Failed to retrieve key: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        return data.data.value;
  
      } catch (error) {
        throw new Error(`Vault access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    /**
     * Get multiple keys at once
     */
    async getKeys(keyNames: string[]): Promise<Record<string, string>> {
      const results: Record<string, string> = {};
      
      // TODO: Implement batch endpoint for better performance
      for (const keyName of keyNames) {
        try {
          results[keyName] = await this.getKey(keyName);
        } catch (error) {
          console.warn(`Failed to retrieve key '${keyName}':`, error);
          // Continue with other keys
        }
      }
      
      return results;
    }
  
    /**
     * Verify vault access and list available keys
     */
    async verify(): Promise<VerifyResponse> {
      try {
        const response = await fetch(`${this.baseUrl}/api/vault/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            environment: this.environment
          })
        });
  
        if (!response.ok) {
          throw new Error(`Verification failed: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        return {
          available_keys: data.data.available_keys.map((k: any) => k.name),
          count: data.data.count
        };
  
      } catch (error) {
        throw new Error(`Vault verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  
    /**
     * Check if vault service is healthy
     */
    async health(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/api/vault/health`);
        const data = await response.json();
        return data.success && data.data.status === 'healthy';
      } catch (error) {
        return false;
      }
    }
  }
  
  // Convenience function for quick setup
  export function createVaultClient(options: VaultClientOptions): VaultClient {
    return new VaultClient(options);
  }