'use client';
import { useState } from 'react';
import { placeOrder } from './actions';

type Product = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string;
  imagenUrl: string | null;
  ingredientes: string | null;
  alergenos: string | null;
  infoNutricional: any;
  tiempoPreparacionMin: number | null;
};

type CartItem = { product: Product; cantidad: number };

export default function MenuClient({
  mesa,
  restaurant,
  categories,
  products,
  sessionToken,
}: {
  mesa: { id: string; numero: number; nombre: string | null; token: string };
  restaurant: { id: string; nombre: string; slug: string };
  categories: { id: string; nombre: string }[];
  products: Product[];
  sessionToken: string;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState<string>('Todos');
  const [sending, setSending] = useState(false);
  const [nota, setNota] = useState('');
  const [showNota, setShowNota] = useState(false);
  const [orderResult, setOrderResult] = useState<{ numero: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = filter === 'Todos' ? products : products.filter((p) => p.categoria === filter);
  const total = cart.reduce((s, i) => s + i.product.precio * i.cantidad, 0);
  const totalItems = cart.reduce((s, i) => s + i.cantidad, 0);

  function add(p: Product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 };
        return copy;
      }
      return [...prev, { product: p, cantidad: 1 }];
    });
  }
  function dec(id: string) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === id);
      if (idx === -1) return prev;
      if (prev[idx].cantidad <= 1) return prev.filter((i) => i.product.id !== id);
      const copy = [...prev];
      copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad - 1 };
      return copy;
    });
  }
  function remove(id: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }
  function getQty(id: string) {
    return cart.find((i) => i.product.id === id)?.cantidad ?? 0;
  }

  async function handleOrder() {
    if (cart.length === 0) return;
    setSending(true);
    const res = await placeOrder({
      mesaId: mesa.id,
      restaurantId: restaurant.id,
      sessionToken,
      items: cart.map((c) => ({ productId: c.product.id, cantidad: c.cantidad })),
      nota: nota || undefined,
    });
    setSending(false);
    if (res?.success) {
      setOrderResult({ numero: res.numero ?? 0, total: res.total ?? 0 });
      setCart([]);
      setNota('');
      setSelected(null);
    } else {
      alert('Error al crear pedido: ' + res?.error);
    }
  }

  // Modal ingredientes helper
  function ingredientesLista(p: Product): string[] {
    if (!p.ingredientes) return [];
    return p.ingredientes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&family=Inter:wght@300;400;500&display=swap');`}</style>
        <div className="bg-white border border-[#e8d5d0] rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-[#166534]">✓</span>
          </div>
          <h1 className="text-2xl font-light tracking-wide text-[#1a1a1a] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Pedido #{orderResult.numero} enviado
          </h1>
          <p className="text-sm text-[#5a4a47] font-medium">Mesa {mesa.numero} {mesa.nombre ? `— ${mesa.nombre}` : ''}</p>
          <p className="text-sm text-[#9a8a86] mt-1">${orderResult.total.toLocaleString('es-AR')} • En preparación</p>
          <button
            onClick={() => setOrderResult(null)}
            className="w-full mt-6 bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-black transition"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;600&family=Inter:wght@300;400;500&display=swap');`}</style>

      {/* Header minimalista beta - sin barras amarillas */}
      <header className="bg-white/95 backdrop-blur border-b border-[#e8d5d0] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-[16px] font-light tracking-[0.2em] text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
              ONLYFOOD
            </h1>
            <p className="text-[11px] tracking-[0.14em] text-[#9a8a86] mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              {restaurant.nombre} — MESA {mesa.numero}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-[#1a1a1a]">Menú</span>
              <span className="text-[11px] text-[#9a8a86]">{filtered.length} platos</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-xs font-light">M{mesa.numero}</div>
          </div>
        </div>
      </header>

      {/* Hero sutil estilo carta - inspiración fotos referencia (tipografía + detalle) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xl font-light text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Carta
          </h2>
          <div className="flex-1 h-[1px] bg-[#e8d5d0] hidden sm:block" />
          <span className="text-[11px] tracking-widest text-[#c9a098] hidden sm:block">BETA</span>
        </div>

        {/* Filtros limpios - estilo cinta del template negro pero en claro */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          <button
            onClick={() => setFilter('Todos')}
            className={`px-5 py-2 rounded-full text-xs tracking-wide whitespace-nowrap border font-medium transition ${filter === 'Todos' ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-[#5a4a47] border-[#e8d5d0] hover:bg-[#fdfbf7]'}`}
          >
            TODOS
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.nombre)}
              className={`px-5 py-2 rounded-full text-xs tracking-wide whitespace-nowrap border font-medium transition uppercase ${filter === c.nombre ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-[#5a4a47] border-[#e8d5d0] hover:bg-[#fdfbf7]'}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Grid productos - diseño editorial limpio, sin textos amarillos */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-40">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#e8d5d0] rounded-2xl p-10 text-center mt-4">
            <p className="text-[#9a8a86] text-sm">No hay platos en esta sección</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => {
              const qty = getQty(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="group bg-white border border-[#e8d5d0] rounded-2xl overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#d8c4bf] transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative h-48 bg-[#f6efe9] overflow-hidden">
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#c9a098]">
                        <span className="text-2xl mb-1">✦</span>
                        <span className="text-[10px] tracking-[0.2em]">ONLYFOOD</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur border border-black/5 text-[10px] tracking-widest px-3 py-1 rounded-full font-medium text-[#5a4a47] uppercase">
                      {p.categoria}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-medium text-[15px] leading-tight text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {p.nombre}
                      </h3>
                      <span className="text-sm font-light whitespace-nowrap text-[#1a1a1a]">${p.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <p className="text-xs text-[#8a7e7b] line-clamp-2 mt-1.5 leading-relaxed min-h-[32px]">{p.descripcion || ''}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-[#c9a098] tracking-wide underline decoration-dotted underline-offset-4">Ver detalle</span>
                      {qty === 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            add(p);
                          }}
                          className="bg-[#1a1a1a] text-white px-5 py-2 rounded-full text-xs font-medium hover:bg-black transition"
                        >
                          Agregar
                        </button>
                      ) : (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-[#fdfbf7] border border-[#e8d5d0] rounded-full p-1"
                        >
                          <button onClick={() => dec(p.id)} className="w-7 h-7 bg-white border border-[#e8d5d0] rounded-full flex items-center justify-center hover:bg-white text-sm">
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{qty}</span>
                          <button onClick={() => add(p)} className="w-7 h-7 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center hover:bg-black text-sm">
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal expansión - foto completa + ingredientes en lista */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-[#fdfbf7] rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#e8d5d0]">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center border border-[#e8d5d0] hover:bg-white text-sm">
              ✕
            </button>
            <div className="bg-[#fdfbf7] flex-shrink-0 flex items-center justify-center p-0 overflow-hidden max-h-[55vh] border-b border-[#e8d5d0]">
              {selected.imagenUrl ? (
                <img src={selected.imagenUrl} alt={selected.nombre} className="w-full h-auto max-h-[55vh] max-w-full object-contain mx-auto block" />
              ) : (
                <div className="w-full h-48 flex flex-col items-center justify-center text-[#c9a098]">
                  <span className="text-3xl mb-2">✦</span>
                  <span className="text-xs tracking-[0.2em]">SIN FOTO</span>
                </div>
              )}
            </div>
            <div className="overflow-auto p-6 space-y-5 bg-white flex-1">
              <div>
                <span className="inline-block bg-[#fdfbf7] border border-[#e8d5d0] text-[10px] tracking-[0.18em] px-3 py-1 rounded-full text-[#9a8a86] uppercase">{selected.categoria}</span>
                <h3 className="text-2xl font-light mt-3 text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {selected.nombre}
                </h3>
                <p className="text-sm text-[#6b5f5b] mt-2 leading-relaxed">{selected.descripcion}</p>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-xl font-light text-[#1a1a1a]">${selected.precio.toLocaleString('es-AR')}</span>
                  {selected.tiempoPreparacionMin && <span className="text-xs text-[#9a8a86]">{selected.tiempoPreparacionMin} min</span>}
                </div>
              </div>

              <div className="h-[1px] bg-[#f0dfda]" />

              <div>
                <h4 className="text-xs tracking-[0.18em] text-[#c9a098] mb-3">INGREDIENTES</h4>
                {ingredientesLista(selected).length > 0 ? (
                  <ul className="space-y-2">
                    {ingredientesLista(selected).map((ing, i) => (
                      <li key={i} className="flex justify-between items-baseline text-sm">
                        <span className="text-[#1a1a1a]">{ing}</span>
                        <span className="flex-1 border-b border-dotted border-[#e8d5d0] mx-3 mb-1" />
                        <span className="text-[#c9a098] text-xs">•</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#9a8a86]">Ingredientes no detallados — consultá con el mozo.</p>
                )}
                {selected.alergenos && (
                  <p className="text-xs text-[#9a8a86] mt-3">
                    <span className="text-[#c9a098] font-medium">Alérgenos:</span> {selected.alergenos}
                  </p>
                )}
              </div>

              {selected.infoNutricional && typeof selected.infoNutricional === 'object' && Object.keys(selected.infoNutricional).length > 0 && (
                <div className="bg-[#fdfbf7] border border-[#e8d5d0] rounded-xl p-4">
                  <h4 className="text-xs tracking-[0.18em] text-[#c9a098] mb-2">INFO NUTRICIONAL</h4>
                  <pre className="text-xs text-[#5a4a47] whitespace-pre-wrap font-sans">{JSON.stringify(selected.infoNutricional, null, 2)}</pre>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    add(selected);
                  }}
                  className="flex-1 bg-[#1a1a1a] text-white py-3 rounded-full font-medium text-sm hover:bg-black transition"
                >
                  Agregar — ${selected.precio.toLocaleString('es-AR')}
                </button>
                <button onClick={() => setSelected(null)} className="px-6 py-3 rounded-full border border-[#e8d5d0] bg-white text-sm text-[#5a4a47] hover:bg-[#fdfbf7]">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carrito minimalista beta - sin barras amarillas */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4 pointer-events-auto">
            <div className="bg-white border border-[#e8d5d0] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-4 py-3 flex justify-between items-center border-b border-[#f0dfda]">
                <div className="flex items-center gap-2">
                  <span className="bg-[#1a1a1a] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">{totalItems}</span>
                  <span className="text-sm font-medium">Carrito</span>
                  <span className="text-xs text-[#9a8a86] hidden sm:inline">Mesa {mesa.numero}</span>
                </div>
                <button onClick={() => setCart([])} className="text-xs text-[#9a8a86] hover:text-[#1a1a1a] px-2 py-1">
                  Vaciar
                </button>
              </div>

              <div className="max-h-[20vh] overflow-auto px-4 py-3 space-y-2">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex justify-between items-center py-2 border-b border-dotted border-[#e8d5d0] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{i.product.nombre}</div>
                      <div className="text-xs text-[#9a8a86]">${i.product.precio.toLocaleString('es-AR')} × {i.cantidad}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-light">${(i.product.precio * i.cantidad).toLocaleString('es-AR')}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => dec(i.product.id)} className="w-6 h-6 bg-white border border-[#e8d5d0] rounded-full flex items-center justify-center text-xs">
                          −
                        </button>
                        <span className="text-xs w-4 text-center">{i.cantidad}</span>
                        <button onClick={() => add(i.product)} className="w-6 h-6 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center text-xs">
                          +
                        </button>
                      </div>
                      <button onClick={() => remove(i.product.id)} className="text-[#c9a098] hover:text-[#991b1b] text-xs ml-1">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {showNota ? (
                  <input
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Nota para cocina (opcional)"
                    className="w-full mt-1 bg-[#fdfbf7] border border-[#e8d5d0] rounded-xl px-3 py-2 text-sm placeholder:text-[#9a8a86] focus:outline-none focus:border-[#c9a098]"
                  />
                ) : (
                  <button onClick={() => setShowNota(true)} className="text-xs text-[#c9a098] hover:text-[#1a1a1a] underline decoration-dotted">
                    + Nota
                  </button>
                )}
              </div>

              <div className="px-4 py-3 flex justify-between items-center gap-3 bg-white">
                <div>
                  <div className="text-[11px] tracking-wide text-[#9a8a86]">TOTAL</div>
                  <div className="text-lg font-light">${total.toLocaleString('es-AR')}</div>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={sending}
                  className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-black disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
