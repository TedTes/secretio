

export interface VaultClientConfig {
  apiUrl: string;
  token: string;
}

export interface VaultKey {
  keyName: string;
  service: string;
  environment: string;
  value?: string;
  maskedValue?: string;
}

export class VaultClient {
  private config: VaultClientConfig;

  constructor(config: VaultClientConfig) {
    this.config = config;
  }

  async getKey(keyName: string, environment = 'production'): Promise<string> {
    const response = await fetch(
      `${this.config.apiUrl}/api/vault/retrieve/${keyName}?environment=${environment}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to retrieve key: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.value;
  }

  async storeKey(keyName: string, value: string, service: string, environment = 'production'): Promise<VaultKey> {
    const response = await fetch(`${this.config.apiUrl}/api/vault/store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyName, value, service, environment })
    });

    if (!response.ok) {
      throw new Error(`Failed to store key: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async listKeys(environment = 'production'): Promise<VaultKey[]> {
    const response = await fetch(
      `${this.config.apiUrl}/api/vault/keys?environment=${environment}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list keys: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
}

// Helper function for easy usage
export function createVaultClient(token: string, apiUrl = 'https://vault.secretio.com'): VaultClient {
  return new VaultClient({ token, apiUrl });
}