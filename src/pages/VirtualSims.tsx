import { useState } from 'react';
import { Smartphone, Signal, Plus, Search, Globe, CreditCard, ShieldCheck } from 'lucide-react';

export function VirtualSims() {
  const [activeTab, setActiveTab] = useState('inventory');

  const mySims = [
    { id: 1, number: '+57 300 123 4567', country: 'Colombia', status: 'Activa', store: 'Dropi Colombia', provider: 'eSIM Global' },
    { id: 2, number: '+52 55 1234 5678', country: 'México', status: 'Inactiva', store: 'Sin Asignar', provider: 'Twilio' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-600" /> Números y SIMs Virtuales
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Olvídate de comprar SIMs físicas. Adquiere líneas virtuales para WhatsApp Business al instante.
          </p>
        </div>
        <button onClick={() => setActiveTab('buy')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
          <Plus className="h-4 w-4" /> Comprar Nuevo Número
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mis Líneas Activas
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'buy' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tienda de Números
          </button>
        </nav>
      </div>

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Número</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">País</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tienda Asignada</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mySims.map((sim) => (
                <tr key={sim.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Signal className="h-5 w-5" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{sim.number}</div>
                        <div className="text-sm text-gray-500">{sim.provider}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium flex items-center gap-1">
                      <Globe className="w-4 h-4 text-gray-400" /> {sim.country}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sim.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {sim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {sim.store}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900">Verificar SMS</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'buy' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Buscar por país (Ej: Colombia, México)..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm" />
            </div>
            <select className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 shadow-sm">
              <option>Filtro: Proveedor (Todos)</option>
              <option>Twilio Numbers</option>
              <option>eSIM Cloud</option>
              <option>Zadarma</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Plan 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-hidden group hover:border-blue-500 transition-colors cursor-pointer">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Recomendado</div>
              <div className="flex justify-between items-start mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">$2<span className="text-sm text-gray-500 font-medium">/mes</span></span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Número Colombia (+57)</h3>
              <p className="text-sm text-gray-500 mb-6 mt-1">Línea móvil virtual apta para recibir SMS de verificación de Meta.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Compatible con WA Business</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> SMS Ilimitados entrantes</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Activación en 5 minutos</li>
              </ul>
              <button className="w-full py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> Comprar Número
              </button>
            </div>

            {/* Plan 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-hidden group hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <Globe className="w-8 h-8 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">$3<span className="text-sm text-gray-500 font-medium">/mes</span></span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Número México (+52)</h3>
              <p className="text-sm text-gray-500 mb-6 mt-1">Línea móvil virtual para operaciones en México.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Compatible con WA Business</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> SMS Ilimitados entrantes</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Activación en 5 minutos</li>
              </ul>
              <button className="w-full py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> Comprar Número
              </button>
            </div>

            {/* Plan 3 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-hidden group hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">$1<span className="text-sm text-gray-500 font-medium">/mes</span></span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Número USA (+1)</h3>
              <p className="text-sm text-gray-500 mb-6 mt-1">Línea toll-free para soporte corporativo global.</p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Compatible con WA Business</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> SMS Ilimitados entrantes</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Activación Inmediata</li>
              </ul>
              <button className="w-full py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> Comprar Número
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
