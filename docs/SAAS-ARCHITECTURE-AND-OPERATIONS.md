# Sharma Dairy Management System — Multi-Tenant SaaS Architecture & Operations Guide

## 1. Platform Architecture
The platform operates as a centralized Multi-Tenant SaaS Dairy ERP supporting unlimited independent dairy businesses (`Dairy` tenants).
- **Platform Owner (`SUPER_ADMIN`)**: Manages tenant approvals, suspensions, SaaS subscription plans, platform analytics, users, and audit logs at `/super-admin/dashboard`.
- **Dairy Business (`Dairy`)**: Each registered dairy receives a unique `id`, `code` (e.g., `SHARMA`), `slug`, custom branding, and isolated operational data.
- **Initial Bootstrap Tenant**: `Sharma Dairy` (`SHARMA`) holds all pre-migration users, farmer profiles, collections, sales, and financial records.

## 2. Role Hierarchy & RBAC
1. `SUPER_ADMIN`: Platform owner. Created solely via `node scripts/bootstrap-super-admin.js`. Public registration is strictly prohibited.
2. `ADMIN`: Dairy business owner/administrator. Full control over their own dairy tenant only.
3. `STAFF`: Dairy operators invited via single-use hashed invitation tokens (`StaffInvitation`) with granular module-level permissions (`collection.create`, `sale.create`, `payment.record`, `reports.view`, `expense.create`, `stock.adjust`).
4. `FARMER`: Milk suppliers bound to a specific dairy tenant. Can view shift collections, Fat/SNF rates, ledger statements, and Digital QR ID Card.
5. `CUSTOMER`: Milk buyers/subscribers bound to a specific dairy tenant. Can view orders, deliveries, bills, payments, and Digital QR ID Card.

## 3. Tenant Isolation Guarantees
- Server-side tenant resolution in `src/lib/auth/tenant.js` (`getTenantContext`, `apiTenantUser`, `apiSuperAdminUser`).
- Client-supplied `dairyId` headers or body payloads are **never trusted** for authorization.
- Every tenant-scoped database query explicitly enforces `where: { dairyId: context.dairyId }`.
- Foreign key lookups (e.g., assigning a collection to a farmer or a sale to a customer) verify ownership (`where: { id, dairyId: context.dairyId }`) to prevent cross-tenant linking.
- Suspended dairies (`DairyStatus.SUSPENDED`) block all tenant logins and API mutations immediately.

## 4. Database Schema & Safe Migrations
- Schema defined in `prisma/schema.prisma` using PostgreSQL and Prisma ORM.
- Migration `20261110051435_multi_tenant_saas_foundation` safely introduced:
  - `Dairy`, `DairyMembership`, `DairyRegistrationRequest`
  - `SubscriptionPlan`, `Subscription`, `SubscriptionPayment`
  - `PlatformNotification`, `PlatformAuditLog`
  - `Product`, `Supplier`, `Purchase`, `PurchaseItem`, `MilkSubscription`, `DailyDelivery`
- Run `node scripts/migrate-initial-tenant.js` to link legacy single-tenant data to `Sharma Dairy` and seed default SaaS plans (`FREE_TRIAL`, `BASIC`, `STANDARD`, `PREMIUM`).

## 5. Key API Modules
- **Auth & Registration**: `/api/auth/login`, `/api/auth/register-dairy`, `/api/auth/register/farmer`, `/api/auth/register/customer`, `/api/auth/register/staff`, `/api/dairies/public`
- **Super Admin**: `/api/super-admin/analytics`, `/api/super-admin/dairies`, `/api/super-admin/registrations`, `/api/super-admin/registrations/[id]/approve`, `/api/super-admin/registrations/[id]/reject`, `/api/super-admin/subscriptions`, `/api/super-admin/users`, `/api/super-admin/audit-logs`
- **Dairy Operations**: `/api/farmers`, `/api/customers`, `/api/collections`, `/api/rates`, `/api/sales`, `/api/subscriptions`, `/api/deliveries`, `/api/stock`, `/api/products`, `/api/suppliers`, `/api/purchases`, `/api/expenses`, `/api/payments/farmer`, `/api/payments/customer`, `/api/reports`, `/api/admin/settings`

## 6. Backup & Recovery
- Automated or manual PostgreSQL backups via `scripts/backup-db.sh` (`pg_dump` custom archive).
- Restoration via `scripts/restore-db.sh` against a staging/recovery database before promoting to production.
- Never run `prisma migrate reset` or destructive commands in production.

