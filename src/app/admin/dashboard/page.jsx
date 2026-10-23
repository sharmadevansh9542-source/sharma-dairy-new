import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Milk, Users, ShoppingBasket, Wallet, LogOut, LayoutDashboard, Settings, ReceiptText } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');
  const start = new Date(); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1);
  const [farmers, customers, staff, collection, sales, farmerPayments, customerPayments, expenses] = await Promise.all([
    prisma.farmerProfile.count({ where: { isActive: true } }), prisma.customerProfile.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'STAFF', isActive: true } }),
    prisma.milkCollection.aggregate({ where: { collectionAt: { gte: start, lt: end } }, _sum: { quantityLitres: true, amount: true } }),
    prisma.sale.aggregate({ where: { saleAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } }, _sum: { quantityLitres: true, amount: true } }),
    prisma.farmerPayment.aggregate({ where: { paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.customerPayment.aggregate({ where: { paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { expenseAt: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);
  const cards = [
    { label: 'Active farmers', value: farmers, icon: Users, detail: 'Registered suppliers' },
    { label: 'Active customers', value: customers, icon: Users, detail: 'Registered buyers' },
    { label: 'Active staff', value: staff, icon: Users, detail: 'Enabled staff accounts' },
    { label: "Today's collection", value: `${Number(collection._sum.quantityLitres || 0).toLocaleString('en-IN')} L`, icon: Milk, detail: money(collection._sum.amount) + ' collection value' },
    { label: "Today's sales", value: `${Number(sales._sum.quantityLitres || 0).toLocaleString('en-IN')} L`, icon: ShoppingBasket, detail: money(sales._sum.amount) + ' sales value' },
    { label: 'Farmer payments today', value: money(farmerPayments._sum.amount), icon: Wallet, detail: 'Cash paid out recorded' },
    { label: 'Customer receipts today', value: money(customerPayments._sum.amount), icon: ReceiptText, detail: 'Payments received recorded' },
    { label: 'Expenses today', value: money(expenses._sum.amount), icon: Wallet, detail: 'Expenses recorded' },
  ];
  return <main className="min-h-screen md:flex"><aside className="w-full bg-green-950 p-5 text-white md:min-h-screen md:w-64"><div className="flex items-center gap-3"><Milk size={28}/><div className="font-bold">Sharma Dairy</div></div><p className="mt-1 text-xs text-green-200">Management System</p><nav className="mt-9 space-y-2"><div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3"><LayoutDashboard size={18}/>Dashboard</div><Link className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/10" href="/admin/farmers"><Users size={18}/>Farmers</Link><Link className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/10" href="/admin/customers"><Users size={18}/>Customers</Link><Link className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/10" href="/admin/settings"><Settings size={18}/>Settings</Link></nav><form action="/api/auth/logout" method="post" className="mt-10"><button className="flex items-center gap-3 rounded-xl px-4 py-3 text-green-100 hover:bg-white/10"><LogOut size={18}/>Sign out</button></form></aside>
    <section className="min-w-0 flex-1 p-5 md:p-9"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-500">{new Intl.DateTimeFormat('en-IN',{dateStyle:'full'}).format(new Date())}</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="mt-2 text-slate-500">Welcome, {user.fullName}. Here is today's recorded activity.</p></div><span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-900">Administrator</span></header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon,detail})=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="rounded-xl bg-green-50 p-2 text-green-800"><Icon size={20}/></span></div><p className="mt-4 break-words text-2xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>)}</div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold">Getting started</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">These dashboard figures are queried from PostgreSQL. A zero value means no matching business records have been entered yet. Outstanding balances, stock reconciliation, reports and transaction workflows will be added in subsequent implementation phases.</p></div>
    </section></main>;
}
