import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

// Evita que Next.js cachee esta ruta — siempre debe traer datos frescos.
export const dynamic = 'force-dynamic';

export async function GET() {
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: RESTAURANT_ID,
      estado: 'en_preparacion',
    },
    include: {
      mesa: true,
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const data = orders.map((o) => ({
    id: `#${o.numero}`,
    mesa: `Mesa ${o.mesa.numero}`,
    creado: o.createdAt,
    notas: o.notas || null,
    items: o.items.map((it) => ({
      cantidad: it.cantidad,
      nombre: it.productNombre,
    })),
  }));

  return NextResponse.json(data);
}
