export interface SnippetOptions {
    keyName: string;
    service: string;
    language: 'javascript' | 'typescript' | 'python' | 'bash' | 'curl';
    environment?: string;
  }
  
  export class SnippetGenerator {
    
    generateSnippet(options: SnippetOptions): string {
      const { keyName, service, language, environment = 'production' } = options;
      
      switch (language) {
        case 'javascript':
          return this.generateJavaScript(keyName, service, environment);
        case 'typescript':
          return this.generateTypeScript(keyName, service, environment);
        case 'python':
          return this.generatePython(keyName, service, environment);
        case 'bash':
          return this.generateBash(keyName, environment);
        case 'curl':
          return this.generateCurl(keyName, environment);
        default:
          return this.generateJavaScript(keyName, service, environment);
      }
    }
  
    private generateJavaScript(keyName: string, service: string, environment: string): string {
      return `// Replace hardcoded ${service} key with vault retrieval
  const { createVaultClient } = require('@secretio/vault-client');
  
  const vault = createVaultClient({
    baseUrl: process.env.VAULT_URL || 'https://vault.secretio.com',
    token: process.env.VAULT_TOKEN,
    environment: '${environment}'
  });
  
  // Before (hardcoded - BAD):
  // const ${this.getVariableName(service)} = 'hardcoded_key_here';
  
  // After (secure - GOOD):
  const ${this.getVariableName(service)} = await vault.getKey('${keyName}');
  
  // Use the key in your application
  ${this.getUsageExample(service, this.getVariableName(service))}`;
    }
  
    private generateTypeScript(keyName: string, service: string, environment: string): string {
      return `// Replace hardcoded ${service} key with vault retrieval
  import { createVaultClient } from '@secretio/vault-client';
  
  const vault = createVaultClient({
    baseUrl: process.env.VAULT_URL || 'https://vault.secretio.com',
    token: process.env.VAULT_TOKEN!,
    environment: '${environment}'
  });
  
  // Before (hardcoded - BAD):
  // const ${this.getVariableName(service)}: string = 'hardcoded_key_here';
  
  // After (secure - GOOD):
  const ${this.getVariableName(service)}: string = await vault.getKey('${keyName}');
  
  // Use the key in your application
  ${this.getUsageExample(service, this.getVariableName(service))}`;
    }
  
  private generatePython(keyName: string, service: string, environment: string): string {
      return `# Replace hardcoded ${service} key with vault retrieval
  import os
  import requests
  
  # Vault configuration
  VAULT_URL = os.getenv('VAULT_URL', 'https://vault.secretio.com')
  VAULT_TOKEN = os.getenv('VAULT_TOKEN')
  
  def get_vault_key(key_name: str, environment: str = '${environment}') -> str:
      """Retrieve API key from Secretio Vault"""
      response = requests.get(
          f"{VAULT_URL}/api/vault/retrieve/{key_name}",
          headers={
              'Authorization': f'Bearer {VAULT_TOKEN}',
              'Content-Type': 'application/json'
          },
          params={'environment': environment}
      )
      response.raise_for_status()
      return response.json()['data']['value']
  
  # Before (hardcoded - BAD):
  # ${this.getVariableName(service).toUpperCase()} = 'hardcoded_key_here'
  
  # After (secure - GOOD):
  ${this.getVariableName(service).toUpperCase()} = get_vault_key('${keyName}')
  
  # Use the key in your application
  ${this.getPythonUsageExample(service, this.getVariableName(service).toUpperCase())}`;
 }
  
    private generateBash(keyName: string, environment: string): string {
      return `#!/bin/bash
  # Retrieve ${keyName} from Secretio Vault
  
  VAULT_URL=\${VAULT_URL:-"https://vault.secretio.com"}
  VAULT_TOKEN=\${VAULT_TOKEN}
  
  # Function to get key from vault
  get_vault_key() {
      local key_name=\$1
      local env=\${2:-"${environment}"}
      
      curl -s \\
          -H "Authorization: Bearer \$VAULT_TOKEN" \\
          -H "Content-Type: application/json" \\
          "\$VAULT_URL/api/vault/retrieve/\$key_name?environment=\$env" \\
          | jq -r '.data.value'
  }
  
  # Get the key
  API_KEY=\$(get_vault_key "${keyName}")
  
  # Use the key
  echo "Retrieved key: \${API_KEY:0:10}..." # Show first 10 chars only`;
    }
  
    private generateCurl(keyName: string, environment: string): string {
      return `# Retrieve ${keyName} from Secretio Vault using cURL
  
  # Set your vault token
  export VAULT_TOKEN="your-vault-token-here"
  export VAULT_URL="https://vault.secretio.com"
  
  # Retrieve the key
  curl -X GET \\
    "\$VAULT_URL/api/vault/retrieve/${keyName}?environment=${environment}" \\
    -H "Authorization: Bearer \$VAULT_TOKEN" \\
    -H "Content-Type: application/json" \\
    | jq -r '.data.value'
  
  # Store in variable
  API_KEY=\$(curl -s \\
    -H "Authorization: Bearer \$VAULT_TOKEN" \\
    "\$VAULT_URL/api/vault/retrieve/${keyName}?environment=${environment}" \\
    | jq -r '.data.value')
  
  echo "Key retrieved: \${API_KEY:0:10}..."`;
    }
  
    private getVariableName(service: string): string {
      // Convert service name to appropriate variable name
      const cleanName = service.replace(/_/g, '').toLowerCase();
      
      switch (service) {
        case 'stripe_secret':
        case 'stripe_secret_test':
          return 'stripeSecretKey';
        case 'openai':
          return 'openaiApiKey';
        case 'github_token':
          return 'githubToken';
        case 'aws_access_key':
          return 'awsAccessKey';
        case 'aws_secret_key':
          return 'awsSecretKey';
        case 'sendgrid':
          return 'sendgridApiKey';
        case 'google_api':
          return 'googleApiKey';
        default:
          return `${cleanName}ApiKey`;
      }
    }
  
    private getUsageExample(service: string, variableName: string): string {
      switch (service) {
        case 'stripe_secret':
        case 'stripe_secret_test':
          return `const stripe = require('stripe')(${variableName});`;
        case 'openai':
          return `const openai = new OpenAI({ apiKey: ${variableName} });`;
        case 'sendgrid':
          return `sgMail.setApiKey(${variableName});`;
        case 'github_token':
          return `const octokit = new Octokit({ auth: ${variableName} });`;
        case 'google_api':
          return `// Use ${variableName} in your Google API calls`;
        default:
          return `// Use ${variableName} in your ${service} integration`;
      }
    }
  
    private getPythonUsageExample(service: string, variableName: string): string {
      switch (service) {
        case 'stripe_secret':
        case 'stripe_secret_test':
          return `import stripe\nstripe.api_key = ${variableName}`;
        case 'openai':
          return `import openai\nclient = openai.OpenAI(api_key=${variableName})`;
        case 'sendgrid':
          return `import sendgrid\nsg = sendgrid.SendGridAPIClient(api_key=${variableName})`;
        default:
          return `# Use ${variableName} in your ${service} integration`;
      }
    }
  
    generateMultipleSnippets(keyName: string, service: string, environment: string = 'production'): Record<string, string> {
      const languages: Array<'javascript' | 'typescript' | 'python' | 'bash' | 'curl'> = 
        ['javascript', 'typescript', 'python', 'bash', 'curl'];
      
      const snippets: Record<string, string> = {};
      
      languages.forEach(lang => {
        snippets[lang] = this.generateSnippet({
          keyName,
          service,
          language: lang,
          environment
        });
      });
      
      return snippets;
    }
  }