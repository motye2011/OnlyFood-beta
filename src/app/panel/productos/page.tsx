import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

async function createProduct(formData: FormData) {
  'use server';
  const nombre = formData.get('nombre') as string;
  const precio = parseFloat(formData.get('precio') as string);
  const categoria = formData.get('categoria') as string;
  const foto = formData.get('foto') as File | null;
  if (!nombre || !precio) return;

  let categoryId: string | null = null;
  if (categoria) {
    const cat = await prisma.category.findFirst({ where: { restaurantId: RESTAURANT_ID, nombre: categoria } });
    if (cat) categoryId = cat.id;
    else {
      const newCat = await prisma.category.create({ data: { restaurantId: RESTAURANT_ID, nombre: categoria } });
      categoryId = newCat.id;
    }
  }

  // Foto -> guardar en BD como archivo en /public/uploads o fallback base64
  let imagenUrl: string | null = null;
  if (foto && foto.size > 0) {
    try {
      const bytes = await foto.arrayBuffer();
      const buffer = Buffer.from(bytes);
      // validar tipo
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (foto.size > 4 * 1024 * 1024) throw new Error('Imagen muy grande (máx 4MB)');
      const ext = foto.type === 'image/png' ? '.png' : foto.type === 'image/webp' ? '.webp' : '.jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`;
      const dir = path.join(process.cwd(), 'public', 'uploads');
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      const filepath = path.join(dir, filename);
      // Intento guardar en disco
      try {
        await writeFile(filepath, buffer);
        imagenUrl = `/uploads/${filename}`;
      } catch {
        // Fallback base64 en BD si no hay permiso disco
        imagenUrl = `data:${foto.type};base64,${buffer.toString('base64')}`;
      }
    } catch (e) {
      console.error('Error foto:', e);
      imagenUrl = null;
    }
  }

  await prisma.product.create({
    data: {
      restaurantId: RESTAURANT_ID,
      categoryId,
      nombre,
      precio,
      descripcion: (formData.get('descripcion') as string) || '',
      imagenUrl,
      disponible: true,
    },
  });
  revalidatePath('/panel/productos');
  revalidatePath('/menu', 'layout');
}

async function toggleDisponible(id: string, disponible: boolean) {
  'use server';
  await prisma.product.update({ where: { id }, data: { disponible: !disponible } });
  revalidatePath('/panel/productos');
  revalidatePath('/menu', 'layout');
}

async function deleteProduct(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;
  const product = await prisma.product.findUnique({ where: { id } });
  // Borrar archivo físico si es /uploads/...
  if (product?.imagenUrl?.startsWith('/uploads/')) {
    try {
      const filepath = path.join(process.cwd(), 'public', product.imagenUrl);
      if (existsSync(filepath)) await unlink(filepath);
    } catch {}
  }
  // Limpieza de relaciones para permitir borrado
  try {
    // Producto puede tener relaciones con restricciones (OrderItem con Restrict)
    // Borramos dependencias que no bloquean, luego intentamos borrar producto
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.productExtra.deleteMany({ where: { productId: id } });
    await prisma.productModel.deleteMany({ where: { productId: id } });
    await prisma.productView.deleteMany({ where: { productId: id } });
    await prisma.modelView.deleteMany({ where: { productId: id } });
    // OrderItem es Restrict - si tiene pedidos, borramos sus extras y luego los items
    const orderItems = await prisma.orderItem.findMany({ where: { productId: id }, select: { id: true } });
    for (const oi of orderItems) {
      await prisma.orderItemExtra.deleteMany({ where: { orderItemId: oi.id } });
    }
    await prisma.orderItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
  } catch (e: any) {
    console.error('deleteProduct error', e.message);
    // Fallback: marcar como no disponible si no se puede borrar por FK
    try {
      await prisma.product.update({ where: { id }, data: { disponible: false, nombre: product?.nombre + ' (eliminado)' } });
    } catch {}
  }
  revalidatePath('/panel/productos');
  revalidatePath('/menu', 'layout');
}

export default async function ProductosPage() {
  const products = await prisma.product.findMany({
    where: { restaurantId: RESTAURANT_ID },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  const categories = await prisma.category.findMany({ where: { restaurantId: RESTAURANT_ID } });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
        Productos
      </h1>
      <p className="text-[#9a8a86] text-sm mb-6">
        {products.length} productos • {categories.length} categorías • La foto se guarda en la base de datos y aparece automáticamente en el menú QR
      </p>

      <form action={createProduct} className="bg-white border border-[#e8d5d0] p-4 rounded-xl mb-6 space-y-3">
        <div className="grid md:grid-cols-5 gap-3">
          <input name="nombre" placeholder="Nombre *" required className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-lg px-3 py-2 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#c9a098]" />
          <input name="precio" placeholder="Precio *" type="number" step="0.01" required className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a098]" />
          <input name="categoria" placeholder="Categoría" list="cats" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a098]" />
          <datalist id="cats">
            {categories.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
          <input name="descripcion" placeholder="Descripción" className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a098]" />
          <button type="submit" className="bg-[#1a1a1a] text-[#fdfbf7] rounded-lg px-4 py-2 text-sm font-medium hover:bg-black transition">
            Agregar
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="flex items-center gap-2 text-sm text-[#5a4a47] w-full">
            <span className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-lg px-3 py-2 text-xs whitespace-nowrap">📷 Foto (opcional)</span>
            <input name="foto" type="file" accept="image/png,image/jpeg,image/webp,image/jpg" className="text-xs text-[#9a8a86] file:mr-2 file:bg-white file:border file:border-[#e8d5d0] file:rounded-lg file:px-3 file:py-1 file:text-xs file:text-[#1a1a1a] hover:file:bg-[#fdfbf7] flex-1" />
          </label>
          <span className="text-[11px] text-[#9a8a86]">PNG/JPG/WebP máx 4MB. Se almacena en BD (`imagen_url`) y se muestra en el menú cliente en su lugar.</span>
        </div>
      </form>

      <div className="bg-white border border-[#e8d5d0] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#fdfbf7] text-[#9a8a86]">
            <tr>
              <th className="text-left p-3 font-light w-16">Foto</th>
              <th className="text-left p-3 font-light">Producto</th>
              <th className="text-left p-3 font-light">Categoría</th>
              <th className="text-left p-3 font-light">Precio</th>
              <th className="text-left p-3 font-light">Estado</th>
              <th className="p-3 font-light text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[#e8d5d0] hover:bg-[#fdfbf7]">
                <td className="p-3">
                  {p.imagenUrl ? (
                    <img src={p.imagenUrl} alt={p.nombre} className="w-12 h-12 rounded-lg object-cover border border-[#e8d5d0] bg-[#fdfbf7]" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#fdfbf7] border border-dashed border-[#e8d5d0] flex items-center justify-center text-[10px] text-[#c9a098]">SIN FOTO</div>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium text-[#1a1a1a]">{p.nombre}</div>
                  <div className="text-xs text-[#9a8a86]">{p.descripcion?.slice(0, 60)}</div>
                  {p.ingredientes && <div className="text-[11px] text-[#c9a098] mt-1">Ing: {p.ingredientes.slice(0, 60)}</div>}
                </td>
                <td className="p-3 text-[#9a8a86]">{p.category?.nombre ?? '-'}</td>
                <td className="p-3 text-[#1a1a1a] font-light">${Number(p.precio).toLocaleString('es-AR')}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.disponible ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                    {p.disponible ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1.5 justify-center">
                    <form action={toggleDisponible.bind(null, p.id, p.disponible)}>
                      <button className="text-xs bg-[#fdfbf7] border border-[#e8d5d0] hover:bg-white px-2.5 py-1 rounded-full text-[#5a4a47]">Toggle</button>
                    </form>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs bg-[#fee2e2] border border-[#fca5a5] hover:bg-[#fecaca] px-2.5 py-1 rounded-full text-[#991b1b] font-medium">Borrar</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="p-8 text-center text-[#9a8a86] text-sm">Sin productos</div>}
      </div>
    </div>
  );
}
