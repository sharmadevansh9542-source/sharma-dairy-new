import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const dairies = await prisma.dairy.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return NextResponse.json({ data: dairies });
  } catch (error) {
    console.error('Public dairy list error:', error);
    return NextResponse.json({ error: 'Unable to fetch active dairies' }, { status: 500 });
  }
}

