import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import FarmerDashboardView from '@/components/farmer-dashboard-view';

export default async function FarmerDashboard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'FARMER') redirect('/dashboard');

  const profile = await prisma.farmerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return (
      <main className="min-h-screen p-8 bg-slate-50 flex items-center justify-center">
        <div className="rounded-2xl border bg-white p-8 max-w-md text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-600">Farmer Profile Not Linked</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your login account exists, but no farmer profile is linked. Please contact Sharma Dairy administrator.
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

  // Fetch only this farmer's private data
  const [collections, payments, ledgerSum, latestRate] = await Promise.all([
    prisma.milkCollection.findMany({
      where: { farmerId: profile.id },
      take: 200,
      orderBy: { collectionAt: 'desc' },
      include: { milkType: true },
    }),
    prisma.farmerPayment.findMany({
      where: { farmerId: profile.id },
      take: 200,
      orderBy: { paidAt: 'desc' },
    }),
    prisma.ledgerEntry.aggregate({
      where: { farmerId: profile.id },
      _sum: { amount: true },
    }),
    prisma.milkRate.findFirst({
      orderBy: { effectiveFrom: 'desc' },
    }),
  ]);

  // Convert Decimals/Dates for serialization to client component
  const serializedCollections = collections.map((c) => ({
    ...c,
    quantityLitres: Number(c.quantityLitres),
    ratePerLitre: Number(c.ratePerLitre),
    amount: Number(c.amount),
    fatPercent: c.fatPercent != null ? Number(c.fatPercent) : null,
    snfPercent: c.snfPercent != null ? Number(c.snfPercent) : null,
    collectionAt: c.collectionAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const serializedPayments = payments.map((p) => ({
    ...p,
    amount: Number(p.amount),
    paidAt: p.paidAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  }));

  const serializedRate = latestRate
    ? {
        ...latestRate,
        fixedRate: latestRate.fixedRate != null ? Number(latestRate.fixedRate) : null,
      }
    : null;

  return (
    <FarmerDashboardView
      user={{
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      }}
      profile={{
        id: profile.id,
        farmerCode: profile.farmerCode,
        village: profile.village,
        address: profile.address,
        animalType: profile.animalType,
        fatherName: profile.fatherName,
      }}
      collections={serializedCollections}
      payments={serializedPayments}
      ledgerSum={Number(ledgerSum._sum.amount || 0)}
      currentRate={serializedRate}
    />
  );
}
