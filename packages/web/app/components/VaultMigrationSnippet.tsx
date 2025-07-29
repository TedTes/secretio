'use client'

import { useState } from 'react';
import { ScanResult } from '../lib/types';

interface Props {
  result: ScanResult;
  onStore: (keyName: string, service: string) => void;
}

export default function VaultMigrationSnippet({ result, onStore }: Props) {
  const [keyName, setKeyName] = useState(`${result.service}_key`);
  const [showSnippet, setShowSnippet] = useState(false);

  const generateSnippet = (language: 'javascript' | 'python') => {
    if (language === 'javascript') {
      return `// Before (insecure):
// const ${result.service}Key = "${result.match}";

// After (secure):
import { createVaultClient } from '@secretio/vault-client';

const vault = createVaultClient(process.env.SECRETIO_TOKEN);
const ${result.service}Key = await vault.getKey('${keyName}');`;
    }

    return `# Before (insecure):
# ${result.service.toUpperCase()}_KEY = "${result.match}"

# After (secure):
import requests

def get_vault_key(key_name):
    response = requests.get(
        f"https://vault.secretio.com/api/vault/retrieve/{key_name}",
        headers={"Authorization": f"Bearer {process.env.SECRETIO_TOKEN}"}
    )
    return response.json()['data']['value']

${result.service.toUpperCase()}_KEY = get_vault_key('${keyName}')`;
  };

  return (
    <div className="bg-slate-700 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">🔒 Secure with Vault</h4>
        <button
          onClick={() => onStore(keyName, result.service)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
        >
          Store in Vault
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          className="w-full bg-slate-600 border border-gray-500 rounded px-3 py-1 text-sm"
          placeholder="Key name in vault"
        />

        <div className="flex space-x-2">
          <button
            onClick={() => setShowSnippet(!showSnippet)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showSnippet ? 'Hide' : 'Show'} migration code
          </button>
        </div>

        {showSnippet && (
          <div className="mt-3">
            <div className="flex space-x-2 mb-2">
              <button className="text-xs bg-slate-600 px-2 py-1 rounded">JavaScript</button>
              <button className="text-xs bg-slate-600 px-2 py-1 rounded">Python</button>
            </div>
            <pre className="bg-slate-800 p-3 rounded text-xs overflow-x-auto">
              <code>{generateSnippet('javascript')}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}