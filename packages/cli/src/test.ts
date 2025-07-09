import { Scanner } from './lib/scanner';

async function test() {
  const scanner = new Scanner();
  
  try {
    const { results, stats } = await scanner.scanDirectory({
      path: process.cwd()
    });
    
    console.log('Test scan results:', { results: results.length, stats });
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();