import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = path.join(__dirname, '../backups');

/**
 * Robustly load environment variables from .env file
 */
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const equalsIndex = trimmedLine.indexOf('=');
      if (equalsIndex === -1) {
        return;
      }

      const key = trimmedLine.substring(0, equalsIndex).trim();
      let value = trimmedLine.substring(equalsIndex + 1).trim();
      // Remove surrounding single or double quotes from the value
      value = value.replace(/^['"]|['"]$/g, '');

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}

async function backup() {
  loadEnv();

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in .env or environment variables.');
    console.error('Please add your connection string to .env:');
    console.error('DATABASE_URL="postgres://postgres:[password]@db...supabase.co:5432/postgres"');
    process.exit(1);
  }

  // Basic validation of dbUrl to prevent command injection
  if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
    console.error('❌ Error: DATABASE_URL must be a valid postgres connection string.');
    process.exit(1);
  }

  // Ensure backup directory exists recursively
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  console.log(`📦 Starting backup to ${filename}...`);

  // Note: Using double quotes around dbUrl for the shell command. 
  // The prefix check above provides basic protection.
  const command = `npx supabase db dump --db-url "${dbUrl}" -f "${filePath}"`;

  await new Promise<void>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Backup failed: ${error.message}`);
        if (stderr) console.error(stderr);
        reject(error);
        return;
      }
      
      if (stdout) {
        console.log(stdout);
      }

      console.log(`✅ Backup completed successfully!`);
      console.log(`Saved to: ${filePath}`);
      
      // Check file size
      try {
        const stats = fs.statSync(filePath);
        console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (statError) {
        console.warn('⚠️ Could not check file size.');
      }
      
      resolve();
    });
  });
}

// Run the backup and handle top-level errors
backup().catch((err) => {
  console.error('💥 Fatal error during backup:', err);
  process.exit(1);
});