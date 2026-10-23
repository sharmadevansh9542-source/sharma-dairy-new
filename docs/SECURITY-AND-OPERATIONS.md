# Security and operations checklist

## Before production
- Set a unique `DATABASE_URL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and 14+ character random `BOOTSTRAP_ADMIN_PASSWORD` in the deployment environment; never commit `.env`.
- Use managed PostgreSQL TLS, least-privilege credentials, automated point-in-time recovery, and separate staging/production databases.
- Run migrations from a controlled release job. Do not use `prisma migrate dev` against production.
- Enable platform WAF/rate limits for login and password-reset endpoints; verify the deployed app has HTTPS and secure cookies.
- Test role/tenant isolation, CSRF posture, duplicate submissions, race conditions, database restoration, and business reconciliation before accepting real transactions.
- Set the business timezone in application settings and confirm it against the database and reporting requirements.
- Establish retention rules for audit records and secure handling for farmer/customer contact details.

## Backup

Run `DATABASE_URL='postgresql://…' scripts/backup-db.sh` on a trusted machine with PostgreSQL client tools. Store encrypted backups outside the application host and test restores regularly. Never put a production connection string in shell history or commit it to source control.

## Restore

Run `DATABASE_URL='postgresql://…' scripts/restore-db.sh backups/file.dump` against a controlled recovery database first. Validate row counts, recent collections, payment totals, stock balances and login before promoting it. Restore may overwrite existing database objects.

## Accounting caveat

Milk collection value, sale value, cash receipts, outstanding balances, inventory valuation and operating profit are different measures. This application starter stores transactions and ledgers, but the financial model needs a dairy-specific accounting review before production use. Never treat sales less collection value as audited profit. Fat/SNF pricing remains policy-configurable and must be approved by the business.
