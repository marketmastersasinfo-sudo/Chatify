import { MessageCircle, Settings, ToggleRight, Plus } from 'lucide-react';

export function Comments() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Asistente Global de Comentarios</h1>
          <p className="mt-2 text-sm text-gray-500">
            Conecta tus Fan Pages de Facebook e Instagram para que la IA responda comentarios y derive tráfico a WhatsApp.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
            <Plus className="h-4 w-4" />
            Conectar Fan Page
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fan Page Card 1 */}
        <div className="glass-card rounded-2xl p-6 border-t-4 border-t-blue-600">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <span className="text-xl font-bold text-blue-600">FB</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Dropi Colombia Store</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Conectado
                </p>
              </div>
            </div>
            <ToggleRight className="h-8 w-8 text-blue-600 cursor-pointer" />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" /> Regla de Auto-Respuesta
              </label>
              <textarea 
                className="w-full text-sm text-gray-600 bg-transparent border-0 p-0 focus:ring-0 resize-none"
                rows={3}
                defaultValue="¡Hola! 👋 Claro que sí, tenemos envío gratis y pago contra entrega. Haz clic en este enlace para atenderte por WhatsApp de inmediato: https://wa.me/573001234567"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Última respuesta hace 5 min</span>
              <button className="text-blue-600 text-sm font-semibold hover:text-blue-800 flex items-center gap-1">
                <Settings className="w-4 h-4" /> Configurar Reglas
              </button>
            </div>
          </div>
        </div>

        {/* Fan Page Card 2 */}
        <div className="glass-card rounded-2xl p-6 border-t-4 border-t-pink-500">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-50 rounded-xl">
                <svg className="h-8 w-8 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Dropi Argentina Oficial</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Conectado
                </p>
              </div>
            </div>
            <ToggleRight className="h-8 w-8 text-blue-600 cursor-pointer" />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" /> Regla de Auto-Respuesta
              </label>
              <textarea 
                className="w-full text-sm text-gray-600 bg-transparent border-0 p-0 focus:ring-0 resize-none"
                rows={3}
                defaultValue="¡Hola! 🇦🇷 Te mandamos info al instante. Escribinos acá a nuestro WhatsApp oficial: https://wa.me/5491112345678"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Última respuesta hace 1 hora</span>
              <button className="text-blue-600 text-sm font-semibold hover:text-blue-800 flex items-center gap-1">
                <Settings className="w-4 h-4" /> Configurar Reglas
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
