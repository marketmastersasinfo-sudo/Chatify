

export function Stores() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Mis Tiendas (Jerarquía Cero Sancocho)</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Administra tus tiendas por país. Configura el número de WhatsApp exclusivo y el Pixel CAPI de cada una.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Agregar Nueva Tienda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tarjeta de Tienda */}
        <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 dark:divide-gray-800 dark:bg-gray-900 dark:ring-gray-800">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Dropi Colombia Principal</h3>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-400">
                🇨🇴 COL
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">ShopyEasy ID: #1092</p>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Número WABA (Bot)</label>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">+57 300 123 4567</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Moneda Local</label>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">COP (Pesos Colombianos)</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Pixel ID (Específico)</label>
              <input 
                type="text" 
                placeholder="Usando el Global por defecto..." 
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                defaultValue="998877665544"
              />
            </div>
          </div>
          <div className="px-4 py-4 sm:px-6 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
             <button className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Verificar Conexión</button>
             <button className="text-sm font-semibold text-gray-900 hover:text-gray-600 dark:text-white">Guardar</button>
          </div>
        </div>

        {/* Otra Tienda */}
        <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 dark:divide-gray-800 dark:bg-gray-900 dark:ring-gray-800">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Dropi Argentina Sur</h3>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-400">
                🇦🇷 ARG
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">ShopyEasy ID: #1105</p>
          </div>
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Número WABA (Bot)</label>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">+54 9 11 1234 5678</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Moneda Local</label>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">ARS (Pesos Argentinos)</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Pixel ID (Específico)</label>
              <input 
                type="text" 
                placeholder="Usando el Global por defecto..." 
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="px-4 py-4 sm:px-6 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
             <button className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Verificar Conexión</button>
             <button className="text-sm font-semibold text-gray-900 hover:text-gray-600 dark:text-white">Guardar</button>
          </div>
        </div>

      </div>
    </div>
  );
}
