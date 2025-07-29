import chalk from 'chalk';
import inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface LoginCredentials {
  email: string;
  password: string;
}

export async function loginCommand() {
  console.log(chalk.blue('🔐 Login to Secretio Vault\n'));

  try {
    const credentials = await inquirer.prompt<LoginCredentials>([
      {
        type: 'input',
        name: 'email',
        message: 'Email:',
        validate: (input) => input.includes('@') || 'Please enter a valid email'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*'
      }
    ]);

    // Call auth API
    const response = await fetch('https://vault.secretio.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Store token in config
    await saveConfig({ token: data.session.access_token });
    
    console.log(chalk.green('✅ Successfully logged in!'));
    console.log(chalk.gray('Token saved to ~/.secretio/config.json'));

  } catch (error) {
    console.error(chalk.red('❌ Login failed:'), error instanceof Error?error.message:error);
    process.exit(1);
  }
}

async function saveConfig(config: { token: string }) {
  const configDir = path.join(os.homedir(), '.secretio');
  const configFile = path.join(configDir, 'config.json');
  
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(configFile, JSON.stringify(config, null, 2));
}