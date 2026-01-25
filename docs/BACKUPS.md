# Database Backups

This project uses a script to backup the Supabase database (PostgreSQL).

## Prerequisites

1.  Ensure you have the Supabase CLI installed (or run via `npx`).
2.  Add your database connection string to your `.env` file:

```bash
DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

You can find this connection string in your Supabase Dashboard under **Settings > Database > Connection strings > URI**.

## Manual Backup

To run a backup manually, execute the following command:

```bash
npx tsx scripts/backup-db.ts
```

This will:
1.  Connect to your remote database using `DATABASE_URL`.
2.  Dump the schema and data using `pg_dump` (via Supabase CLI).
3.  Save the resulting SQL file to the `backups/` directory with a timestamp.

## Restoring a Backup

**⚠️ Warning: Restoring will overwrite existing data. Proceed with caution.**

To restore a backup, you can use the `psql` command line tool or the Supabase dashboard.

### Using CLI (psql)

```bash
psql "$DATABASE_URL" < backups/backup_YYYY-MM-DD-....sql
```

### Using Supabase Dashboard

1.  Open the SQL Editor in your Supabase Dashboard.
2.  Copy the content of the `.sql` backup file.
3.  Paste it into the editor and run it. 
    *Note: For large backups, this might timeout. Use the CLI method instead.*

## Automated Backups (CI/CD)

To schedule backups via GitHub Actions:
1.  Add `DATABASE_URL` to your GitHub Repository Secrets.
2.  Create a workflow file `.github/workflows/backup.yml` that runs the script and uploads the artifact or saves it to external storage (S3, Google Drive, etc.).
