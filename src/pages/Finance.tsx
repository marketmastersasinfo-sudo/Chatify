

export function Finance() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Panel Financiero Granular</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Desglose de costos de API de Meta por Organización, Tienda y Número de WhatsApp. (Montos estimados en USD)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gasto Total Organizacional</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">$342.50 USD</p>
        </div>
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversaciones Marketing (Costo)</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">$210.00 USD</p>
        </div>
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversaciones Utility (Costo)</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">$132.50 USD</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="mt-8 overflow-hidden bg-white shadow sm:rounded-lg ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Desglose por Tienda y Número</h3>
        </div>
        <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800">
          <li className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">Tienda Colombia Principal</p>
              <div className="ml-2 flex shrink-0">
                <p className="inline-flex rounded-full bg-green-50 px-2 text-xs font-semibold leading-5 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  Calidad: Verde (Tier 10K)
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  WABA: +57 300 123 4567
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 dark:text-gray-400">
                <p>Gasto mensual: <span className="font-semibold text-gray-900 dark:text-white">$150.00 USD</span></p>
              </div>
            </div>
          </li>
          <li className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium text-blue-600 dark:text-blue-400">Tienda Argentina Dropi</p>
              <div className="ml-2 flex shrink-0">
                <p className="inline-flex rounded-full bg-yellow-50 px-2 text-xs font-semibold leading-5 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-500">
                  Calidad: Amarilla (1 Strike)
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  WABA: +54 9 11 1234 5678
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 dark:text-gray-400">
                <p>Gasto mensual: <span className="font-semibold text-gray-900 dark:text-white">$80.20 USD</span></p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
