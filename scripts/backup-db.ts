import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = path.join(__dirname, '../backups');

// function to load .env manually since we don't have dotenv
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
        if (!process.env[key]) {
          process.env[key] = value;
        }
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

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  console.log(`📦 Starting backup to ${filename}...`);

  const command = `npx supabase db dump --db-url "${dbUrl}" -f "${filePath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Backup failed: ${error.message}`);
      if (stderr) console.error(stderr);
      return;
    }
    
    console.log(`✅ Backup completed successfully!`);
    console.log(`Saved to: ${filePath}`);
    
    // Optional: Check file size
    const stats = fs.statSync(filePath);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  });
}

backup();
