import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/database';
async function setupDatabase() {
  console.log('🗄️  Setting up Supabase database...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement: ${error.message}`);
        console.error(`Statement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log('✅ Database setup completed!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();