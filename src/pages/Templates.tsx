import { useState } from 'react';
import { Store, Plus, Search, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function Templates() {
  const [selectedStore, setSelectedStore] = useState('none');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestor de Plantillas WA</h1>
          <p className="mt-2 text-sm text-gray-500">
            Crea plantillas oficiales de Meta para remarketing y difusión masiva.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500 transition-colors">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-6 bg-white">
        
        {/* Store Isolation Selector */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Store className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Aislamiento por Tienda / WABA</h3>
              <p className="text-xs text-gray-500">Selecciona la línea de WhatsApp para ver y gestionar sus plantillas locales.</p>
            </div>
          </div>
          
          <select 
            className="pl-3 pr-8 py-2 text-sm font-semibold border border-blue-200 rounded-lg text-blue-900 focus:ring-1 focus:ring-blue-500 bg-white min-w-[200px]"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="none" disabled>Seleccionar Tienda...</option>
            <option value="dropi_co">Dropi Colombia (+57 320...)</option>
            <option value="dropi_mx">Dropi México (+52 55...)</option>
            <option value="dropi_ar">Dropi Argentina (+54 9...)</option>
          </select>
        </div>

        {selectedStore === 'none' ? (
          <div className="mt-8 text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Selecciona una tienda</h3>
            <p className="text-gray-500 text-sm mt-1">Debes seleccionar una tienda arriba para ver sus plantillas aprobadas por Meta.</p>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Plantillas Activas</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar plantilla..." 
                  className="pl-9 pr-4 py-2 border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-gray-50/50 w-64"
                />
              </div>
            </div>

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Template Card 1 */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors shadow-sm">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">remarketing_carrito_24h</h4>
                    <span className="text-xs text-gray-500 font-medium">Categoría: MARKETING</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">
                    <CheckCircle className="w-3 h-3" /> Aprobada
                  </span>
                </div>
                <div className="p-4 bg-gray-50/50">
                  <p className="text-sm text-gray-700 font-medium font-sans">
                    ¡Hola &#123;&#123;1&#125;&#125;! 👋 Notamos que dejaste tu &#123;&#123;2&#125;&#125; en el carrito. ¿Tuviste algún problema con la compra? Te ofrecemos envío GRATIS si completas tu pedido hoy.
                  </p>
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
                  <button className="text-xs font-semibold text-gray-500 hover:text-blue-600">Editar y Re-enviar</button>
                </div>
              </div>

              {/* Template Card 2 */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors shadow-sm">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">confirmacion_pedido_v1</h4>
                    <span className="text-xs text-gray-500 font-medium">Categoría: UTILITY</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">
                    <CheckCircle className="w-3 h-3" /> Aprobada
                  </span>
                </div>
                <div className="p-4 bg-gray-50/50">
                  <p className="text-sm text-gray-700 font-medium font-sans">
                    ¡Gracias por tu compra, &#123;&#123;1&#125;&#125;! Hemos recibido tu pedido por el valor de &#123;&#123;2&#125;&#125;. Para poder despacharlo, necesitamos que nos confirmes tu dirección.
                  </p>
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
                  <button className="text-xs font-semibold text-gray-500 hover:text-blue-600">Editar y Re-enviar</button>
                </div>
              </div>

              {/* Template Card 3 */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors shadow-sm">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">promo_black_friday</h4>
                    <span className="text-xs text-gray-500 font-medium">Categoría: MARKETING</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">
                    <Clock className="w-3 h-3" /> En Revisión
                  </span>
                </div>
                <div className="p-4 bg-gray-50/50">
                  <p className="text-sm text-gray-700 font-medium font-sans">
                    ¡Llegó el Black Friday a Dropi! 🚀 Solo por hoy, todos nuestros productos tienen 50% de descuento. Toca el botón de abajo para ver el catálogo.
                  </p>
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
                  <button className="text-xs font-semibold text-gray-500 hover:text-blue-600" disabled>Esperando a Meta...</button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
