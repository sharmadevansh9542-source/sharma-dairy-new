import Link from 'next/link';
import { Milk, ShieldCheck, ChartNoAxesCombined, Users } from 'lucide-react';
export default function Home() {
  return <main className="min-h-screen px-5 py-12 md:px-12">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center gap-3"><div className="rounded-2xl bg-green-800 p-3 text-white"><Milk size={28}/></div><div><p className="text-xl font-bold text-green-950">Sharma Dairy</p><p className="text-sm text-slate-500">Management System</p></div></header>
      <section className="grid items-center gap-12 py-20 md:grid-cols-2 md:py-28">
        <div><p className="mb-4 inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-900">Digital dairy operations</p><h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">Your dairy business, <span className="text-green-800">in control.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Manage milk collection, farmers, customers, deliveries, payments and stock from one secure workspace.</p><Link href="/login" className="mt-8 inline-flex rounded-xl bg-green-800 px-6 py-3 font-semibold text-white shadow-sm hover:bg-green-900">Sign in to continue</Link></div>
        <div className="grid grid-cols-2 gap-4">{[[Milk,'Milk collection','Record shift-wise litres'],[Users,'People','Farmers and customers'],[ChartNoAxesCombined,'Reports','Track business performance'],[ShieldCheck,'Secure access','Role-based permissions']].map(([Icon,title,desc])=><div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-8 text-green-800" size={26}/><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p></div>)}</div>
      </section><footer className="border-t border-slate-200 py-6 text-sm text-slate-500">Sharma Dairy · Secure dairy operations</footer>
    </div>
  </main>;
}
