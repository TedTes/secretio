import { Command } from 'commander';
import chalk from 'chalk';
import {scanCommand,loginCommand,vaultCommand } from "./commands";

const program = new Command();

program
  .name('secretio')
  .description('Secure API key scanner and vault CLI')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan current directory for API keys')
  .option('-p, --path <path>', 'Path to scan', '.')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .option('-o, --output <file>', 'Output to file')
  .action(scanCommand);

program
  .command('login')
  .description('Login to Secretio vault')
  .action(loginCommand);

program
  .command('vault')
  .description('Manage vault keys')
  .argument('[action]', 'Action: list, get, store')
  .argument('[key]', 'Key name')
  .action(vaultCommand);

program.parse();