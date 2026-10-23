#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL in the environment}"
command -v pg_dump >/dev/null || { echo 'pg_dump is required'; exit 1; }
mkdir -p backups
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "backups/sharma-dairy-${stamp}.dump"
echo "Backup created: backups/sharma-dairy-${stamp}.dump"
