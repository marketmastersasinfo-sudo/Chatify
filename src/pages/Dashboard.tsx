import { Calendar as CalendarIcon, Filter } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Global (USD)</h1>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex gap-2">
          <select className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
            <option>Hoy</option>
            <option>Ayer</option>
            <option>Últimos 7 días</option>
            <option>Este Mes</option>
            <option>Personalizado (Desde - Hasta)</option>
          </select>
          <button className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700 dark:hover:bg-gray-700">
            <CalendarIcon className="-ml-0.5 h-4 w-4" aria-hidden="true" />
            01 Jun - 10 Jun
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards */}
        {['Ventas Netas', 'Conversaciones Activas', 'Tasa de Conversión', 'Gasto en Meta (Est)'].map((metric) => (
          <div key={metric} className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
            <p className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">{metric}</p>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">0</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800 h-96 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Gráfico del embudo de conversión</p>
      </div>
    </div>
  );
}
