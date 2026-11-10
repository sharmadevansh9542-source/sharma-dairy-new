import Link from 'next/link';
import {
  Milk,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Tractor,
  ShoppingBag,
  Wallet,
  Receipt,
  Boxes,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50/50 via-white to-slate-50">
      {/* Top Navigation */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-green-800 p-2.5 text-white shadow-sm">
              <Milk size={26} />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-green-950">Sharma Dairy</p>
              <p className="text-[11px] font-semibold text-green-700">Multi-Tenant Dairy ERP & SaaS Platform</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register-dairy"
              className="rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-900 transition flex items-center gap-1.5"
            >
              <Building2 size={14} /> Register Dairy
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-xs font-bold text-green-900 border border-green-200">
            <Sparkles size={14} className="text-green-700" />
            Enterprise Multi-Tenant Dairy ERP Platform
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl leading-tight">
            Complete cloud operations for <br />
            <span className="text-green-800">every dairy business.</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            One unified SaaS platform powering independent dairies, milk collection centers, and cooperative societies.
            Manage milk collection, Fat/SNF rate pricing, farmer ledgers, recurring customer deliveries, and audit-ready financials with complete tenant isolation.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register-dairy"
              className="rounded-2xl bg-green-800 px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-green-900 transition flex items-center gap-2"
            >
              Start Free 14-Day Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition"
            >
              Member Sign In
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-600" /> Complete Tenant Data Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-600" /> Shift-Wise Fat/SNF Rates
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-600" /> Instant Slip & QR Codes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-green-600" /> Audit-Ready Double Entry
            </span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-white py-20 border-y border-slate-200 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-green-800">Platform Architecture</h2>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">Engineered for real-world dairy operations</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                Building2,
                'Multi-Tenant SaaS Architecture',
                'Supports unlimited dairy businesses on one centralized platform. Every business gets separate tenant IDs, data storage, and custom branding.',
              ],
              [
                Milk,
                'Shift-Wise Milk Collection',
                'Record morning and evening intake for cow and buffalo milk with automatic Fat/SNF calculations and instant digital collection slips.',
              ],
              [
                Tractor,
                'Farmer Management & Ledger',
                'Unique Farmer IDs, digital passbooks, real-time balance calculations, advances, deductions, and bank/UPI payout statements.',
              ],
              [
                ShoppingBag,
                'Customer Subscriptions & Billing',
                'Daily recurring milk deliveries, pause/resume schedules, automated monthly invoice generation, and walk-in sales counter.',
              ],
              [
                Boxes,
                'Dual Inventory Engine',
                'Track raw milk tank stock and packaged dairy goods (Ghee, Paneer, Curd, Butter) with automated stock movements and wastage logs.',
              ],
              [
                ChartNoAxesCombined,
                'Accounting & Financial Reports',
                'Cashbook, bankbook, category-wise expenses, supplier payables, customer receivables, and estimated daily profit & loss statements.',
              ],
            ].map(([Icon, title, desc]) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 hover:bg-white hover:shadow-lg transition space-y-3"
              >
                <div className="rounded-2xl bg-green-100 p-3 text-green-800 w-fit">
                  <Icon size={24} />
                </div>
                <h3 className="font-bold text-base text-slate-900">{title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Portals Links */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-green-950 text-white p-8 md:p-14 overflow-hidden relative">
          <div className="max-w-2xl relative z-10 space-y-4">
            <span className="inline-flex rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-green-300">
              Role-Based Access Control
            </span>
            <h2 className="text-3xl font-extrabold sm:text-4xl leading-tight">
              Dedicated dashboards for every stakeholder.
            </h2>
            <p className="text-sm text-green-200 leading-relaxed">
              Super Admin manages platform health and subscriptions. Dairy Admins manage business operations.
              Farmers and Customers view transparent ledgers. Staff handle daily operations securely.
            </p>

            <div className="pt-4 flex flex-wrap gap-3 text-xs">
              <Link
                href="/login?role=Admin"
                className="rounded-xl bg-white text-green-950 font-bold px-4 py-2.5 hover:bg-green-100 transition"
              >
                Dairy Admin Portal
              </Link>
              <Link
                href="/login?role=Farmer"
                className="rounded-xl bg-white/15 text-white font-semibold px-4 py-2.5 hover:bg-white/20 transition"
              >
                Farmer Portal
              </Link>
              <Link
                href="/login?role=Customer"
                className="rounded-xl bg-white/15 text-white font-semibold px-4 py-2.5 hover:bg-white/20 transition"
              >
                Customer Portal
              </Link>
              <Link
                href="/login?role=Staff"
                className="rounded-xl bg-white/15 text-white font-semibold px-4 py-2.5 hover:bg-white/20 transition"
              >
                Staff Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Milk size={18} className="text-green-800" />
            <span className="font-bold text-slate-900">Sharma Dairy Management System</span>
            <span>· Multi-Tenant Dairy ERP SaaS</span>
          </div>
          <div className="flex gap-4">
            <Link href="/register-dairy" className="hover:text-green-800">Register Dairy</Link>
            <Link href="/register/farmer" className="hover:text-green-800">Register as Farmer</Link>
            <Link href="/register/customer" className="hover:text-green-800">Register as Customer</Link>
            <Link href="/login" className="hover:text-green-800">Sign In</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
