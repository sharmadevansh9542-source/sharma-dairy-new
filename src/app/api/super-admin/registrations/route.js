import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiSuperAdminUser } from '@/lib/auth/tenant';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { user, response } = await apiSuperAdminUser();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim() || 'PENDING_APPROVAL';

    const where = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.dairyRegistrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const data = requests.map((r) => ({
      id: r.id,
      dairyName: r.dairyName,
      ownerName: r.ownerName,
      businessEmail: r.businessEmail,
      phone: r.phone,
      address: r.address,
      city: r.city,
      state: r.state,
      pincode: r.pincode,
      businessType: r.businessType,
      description: r.description,
      adminFullName: r.adminFullName,
      adminEmail: r.adminEmail,
      adminPhone: r.adminPhone,
      status: r.status,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      rejectionReason: r.rejectionReason,
      createdDairyId: r.createdDairyId,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Super Admin get registration requests error:', error);
    return NextResponse.json({ error: 'Unable to load registration requests' }, { status: 500 });
  }
}

