#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL in the environment}"
backup="${1:?Usage: scripts/restore-db.sh path/to/backup.dump}"
[ -f "$backup" ] || { echo "Backup file not found: $backup"; exit 1; }
echo 'WARNING: restoring can overwrite target database objects.'
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$backup"
echo 'Restore command finished. Verify records and application health before reopening business operations.'
