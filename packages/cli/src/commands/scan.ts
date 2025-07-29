import chalk from 'chalk';
import ora from 'ora';
import { Scanner } from '../lib/scanner';
import { ScanOptions } from '../types';
import { formatResults } from '../lib/formatter';

export async function scanCommand(options: ScanOptions) {
  const spinner = ora('🔍 Scanning for API keys...').start();
  
  try {
    const scanner = new Scanner();
    const { results, stats } = await scanner.scanDirectory(options);
    
    spinner.stop();
    
    if (results.length === 0) {
      console.log(chalk.green('✅ No exposed API keys found!'));
      return;
    }
    
    console.log(chalk.red(`\n❌ Found ${stats.keysFound} API keys in ${stats.filesScanned} files:`));
    console.log(formatResults(results, options.format || 'table'));
    
    console.log(chalk.yellow('\n💡 Secure these keys with Secretio Vault:'));
    console.log(chalk.blue('   secretio login'));
    console.log(chalk.blue('   secretio vault store <keyname> <value>'));
    
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('❌ Scan failed:'), error instanceof  Error?error.message:error);
    process.exit(1);
  }
}