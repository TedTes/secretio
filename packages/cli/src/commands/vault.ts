import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig } from '../lib/config';
import { createVaultClient } from '../lib/vaultClient';

export async function vaultCommand(action?: string, keyName?: string) {
  try {
    const config = await loadConfig();
    if (!config.token) {
      console.log(chalk.red('❌ Not logged in. Run: secretio login'));
      return;
    }

    const vault = createVaultClient(config.token);

    switch (action) {
      case 'list':
        await listKeys(vault);
        break;
      case 'get':
        if (!keyName) {
          console.log(chalk.red('❌ Key name required: secretio vault get <keyname>'));
          return;
        }
        await getKey(vault, keyName);
        break;
      case 'store':
        await storeKeyInteractive(vault);
        break;
      default:
        console.log(chalk.blue('📦 Vault Commands:'));
        console.log('  secretio vault list     - List all keys');
        console.log('  secretio vault get <key> - Get key value');
        console.log('  secretio vault store     - Store a new key');
    }
  } catch (error) {
    console.error(chalk.red('❌ Vault error:'), error instanceof Error?error.message:error);
  }
}

async function listKeys(vault: any) {
  const keys = await vault.listKeys();
  
  if (keys.length === 0) {
    console.log(chalk.yellow('📭 No keys stored in vault'));
    return;
  }

  console.log(chalk.blue(`\n📦 Vault Keys (${keys.length}):\n`));
  keys.forEach((key: any) => {
    console.log(`  ${chalk.green(key.keyName)} (${key.service})`);
    console.log(`    ${chalk.gray(key.maskedValue)}\n`);
  });
}

async function getKey(vault: any, keyName: string) {
  const value = await vault.getKey(keyName);
  console.log(chalk.green(`🔑 ${keyName}:`), value);
}

async function storeKeyInteractive(vault: any) {
  const answers = await inquirer.prompt([
    { name: 'keyName', message: 'Key name:' },
    { name: 'service', message: 'Service (e.g., stripe, aws, openai):' },
    { type: 'password', name: 'value', message: 'Key value:', mask: '*' }
  ]);

  await vault.storeKey(answers.keyName, answers.value, answers.service);
  console.log(chalk.green('✅ Key stored successfully!'));
}