import React from 'react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Global (USD)</h1>
        <div className="flex items-center gap-4">
          <select className="rounded-md border-gray-300 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <option>Hoy</option>
            <option>Ayer</option>
            <option>Últimos 7 días</option>
            <option>Este mes</option>
          </select>
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
