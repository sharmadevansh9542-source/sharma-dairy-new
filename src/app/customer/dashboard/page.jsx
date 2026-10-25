import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import CustomerDashboardView from '@/components/customer-dashboard-view';

export default async function CustomerDashboard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'CUSTOMER') redirect('/dashboard');

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <main className="min-h-screen p-8 bg-slate-50 flex items-center justify-center">
        <div className="rounded-2xl border bg-white p-8 max-w-md text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">Customer Profile Not Linked</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your login account exists, but no customer profile is linked. Please contact Sharma Dairy administrator.
          </p>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Fetch only this customer's private data
  const [sales, payments, charges, received] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: profile.id },
      take: 200,
      orderBy: { saleAt: 'desc' },
      include: { milkType: true },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: profile.id },
      take: 200,
      orderBy: { paidAt: 'desc' },
    }),
    prisma.sale.aggregate({
      where: { customerId: profile.id, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
    }),
    prisma.customerPayment.aggregate({
      where: { customerId: profile.id },
      _sum: { amount: true },
    }),
  ]);

  const serializedSales = sales.map((s) => ({
    ...s,
    quantityLitres: Number(s.quantityLitres),
    ratePerLitre: Number(s.ratePerLitre),
    amount: Number(s.amount),
    saleAt: s.saleAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const serializedPayments = payments.map((p) => ({
    ...p,
    amount: Number(p.amount),
    paidAt: p.paidAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <CustomerDashboardView
      user={{
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      }}
      profile={{
        id: profile.id,
        customerCode: profile.customerCode,
        address: profile.address,
        category: profile.category,
        defaultMilkType: profile.defaultMilkType,
        defaultRate: profile.defaultRate != null ? Number(profile.defaultRate) : null,
        dailyRequirement: profile.dailyRequirement != null ? Number(profile.dailyRequirement) : null,
        billingCycle: profile.billingCycle,
      }}
      sales={serializedSales}
      payments={serializedPayments}
      totalBilled={Number(charges._sum.amount || 0)}
      totalPaid={Number(received._sum.amount || 0)}
    />
  );
}
