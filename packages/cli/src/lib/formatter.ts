import chalk from 'chalk';
import { ScanResult } from '../types';

export function formatResults(results: ScanResult[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }
  
  // Table format
  let output = '\n';
  
  results.forEach((result, index) => {
    const severity = getSeverityColor(result.severity);
    const file = chalk.cyan(result.file_path);
    const line = chalk.gray(`line ${result.line_number}`);
    
    output += `${index + 1}. ${severity} ${result.service}\n`;
    output += `   ${file}:${line}\n`;
    output += `   ${chalk.gray(result.description)}\n\n`;
  });
  
  return output;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high': return chalk.red('🔴 HIGH');
    case 'medium': return chalk.yellow('🟡 MEDIUM');
    case 'low': return chalk.blue('🔵 LOW');
    default: return chalk.gray('⚪ UNKNOWN');
  }
}