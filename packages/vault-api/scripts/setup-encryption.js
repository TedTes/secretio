const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

function generateEncryptionKey() {
  return randomBytes(32).toString('hex');
}

function setupEncryption() {
  const envPath = path.join(__dirname, '../.env');
  const key = generateEncryptionKey();
  
  console.log('🔐 Setting up vault encryption...');
  console.log('Generated encryption key:', key);
  console.log('');
  console.log('Add this to your .env file:');
  console.log(`VAULT_ENCRYPTION_KEY=${key}`);
  console.log(`VAULT_ENCRYPTION_ALGORITHM=aes-256-gcm`);
  console.log('');
  console.log('⚠️  IMPORTANT: Store this key securely and never commit it to version control!');
}

if (require.main === module) {
  setupEncryption();
}

module.exports = { generateEncryptionKey, setupEncryption };