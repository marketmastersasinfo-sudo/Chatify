import { useState } from 'react';
import { Megaphone, Users, Filter, FileText, Send, CheckCircle2, AlertCircle, Search } from 'lucide-react';

export function Broadcast() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> Difusión Masiva (Ráfagas)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Envía promociones y avisos masivos a tu base de datos cumpliendo las políticas de Meta.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-indigo-100' : 'bg-gray-100'}`}>1</div>
            <span className="font-bold text-sm">Audiencia</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
          <div className={`flex items-center gap-3 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-indigo-100' : 'bg-gray-100'}`}>2</div>
            <span className="font-bold text-sm">Plantilla A/B</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
          <div className={`flex items-center gap-3 ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-indigo-100' : 'bg-gray-100'}`}>3</div>
            <span className="font-bold text-sm">Lanzamiento</span>
          </div>
        </div>
      </div>

      {/* Step 1: Audiencia */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Filter className="w-5 h-5 text-indigo-600"/> 1. Segmentar Audiencia</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tienda de Origen</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option>Dropi Colombia</option>
                  <option>Nicho Belleza CO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Última Compra (Tiempo)</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option>Hace más de 30 días</option>
                  <option>Hace más de 60 días</option>
                  <option>Nunca han comprado (Solo Leads)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Etiqueta de Cliente</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option>Clientes VIP (Compraron Smartwatch)</option>
                  <option>Todos los contactos</option>
                </select>
              </div>
            </div>

            <div className="mt-8 bg-indigo-50 p-4 rounded-xl flex items-center justify-between border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm"><Users className="w-6 h-6 text-indigo-600"/></div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Audiencia Calculada</p>
                  <p className="text-2xl font-bold text-indigo-700">1,245 <span className="text-sm font-normal">Contactos viables</span></p>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-soft">
                Continuar a Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Plantilla */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> 2. Elegir Plantilla Aprobada</h2>
              <button onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Volver Atrás</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A */}
              <div className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50/30 cursor-pointer relative">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Seleccionada</div>
                <h4 className="font-bold text-gray-900 mb-2">Promo Black Friday V1 (Texto)</h4>
                <div className="bg-white p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                  "¡Hola {'{{1}}'}! Llegó el Black Friday a Dropi. Tenemos 50% de descuento en toda la tienda. Solo por hoy."
                </div>
                <div className="mt-3 text-xs font-semibold text-gray-500 flex justify-between">
                  <span>Categoría: MARKETING</span>
                  <span className="text-green-600">Aprobada por Meta</span>
                </div>
              </div>

              {/* Option B */}
              <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 cursor-pointer transition-colors">
                <h4 className="font-bold text-gray-900 mb-2">Promo Black Friday V2 (Multimedia)</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-100">
                  <span className="text-xs text-blue-500 font-bold block mb-1">[IMAGEN: Banner Black Friday]</span>
                  "¡Hola {'{{1}}'}! El reloj inteligente que viste ahora está a mitad de precio. ¡Unidades limitadas!"
                </div>
                <div className="mt-3 text-xs font-semibold text-gray-500 flex justify-between">
                  <span>Categoría: MARKETING</span>
                  <span className="text-green-600">Aprobada por Meta</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-soft">
                Continuar a Lanzamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Lanzamiento */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600"/> 3. Confirmación y Lanzamiento</h2>
              <button onClick={() => setStep(2)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Volver Atrás</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Resumen de la Campaña</h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Audiencia Objetivo:</span>
                  <span className="text-sm font-bold text-gray-900">1,245 Contactos (Clientes VIP)</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Plantilla Seleccionada:</span>
                  <span className="text-sm font-bold text-gray-900">Promo Black Friday V1</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Costo Estimado (Meta):</span>
                  <span className="text-sm font-bold text-red-600">~ $62.25 USD</span>
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100 mb-8">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800 font-medium">
                Al hacer clic en lanzar, los mensajes se enviarán en lotes de 50 por minuto para evitar baneos de WhatsApp por SPAM. El proceso tomará aproximadamente 25 minutos en completarse.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <button className="px-6 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Guardar como Borrador
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-soft flex items-center gap-2">
                <Send className="w-4 h-4" /> Lanzar Ráfaga Ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
