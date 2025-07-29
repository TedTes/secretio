import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface Config {
  token?: string;
  apiUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.secretio');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}