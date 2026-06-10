

export function Settings() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Configuración Global</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Administra las claves de acceso general, el motor de Inteligencia Artificial y el Pixel Maestro de Meta.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* API Meta / CAPI */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 lg:col-span-1 dark:bg-gray-900 dark:ring-gray-800">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">Tracking y Anuncios (Meta)</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Configura la API de Conversiones (CAPI). Si una tienda no tiene Pixel propio, los eventos (Purchase) se enviarán aquí.
            </p>

            <form className="mt-6 space-y-4">
              <div>
                <label htmlFor="pixel_id" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Pixel ID Global</label>
                <div className="mt-2">
                  <input type="text" id="pixel_id" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" placeholder="Ej: 1029384756" />
                </div>
              </div>
              <div>
                <label htmlFor="capi_token" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Conversions API (CAPI) Access Token</label>
                <div className="mt-2">
                  <input type="password" id="capi_token" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" placeholder="EAAI..." />
                </div>
              </div>
              <div className="flex items-center justify-end pt-4">
                <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Guardar Tracking</button>
              </div>
            </form>
          </div>
        </div>

        {/* Divisas y Finanzas */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 lg:col-span-1 dark:bg-gray-900 dark:ring-gray-800">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">Finanzas y Dashboard Global</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Establece las divisas por defecto para que el Dashboard convierta correctamente todo a Dólares (USD).
            </p>

            <form className="mt-6 space-y-4">
              <div>
                <label htmlFor="cop_rate" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Tasa de Cambio COP a USD</label>
                <div className="mt-2">
                  <input type="number" id="cop_rate" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" defaultValue="4100" />
                </div>
              </div>
              <div>
                <label htmlFor="ars_rate" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Tasa de Cambio ARS a USD</label>
                <div className="mt-2">
                  <input type="number" id="ars_rate" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" defaultValue="1000" />
                </div>
              </div>
              <div className="flex items-center justify-end pt-4">
                <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Guardar Divisas</button>
              </div>
            </form>
          </div>
        </div>

        {/* API Keys de IA y Fallback */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2 dark:bg-gray-900 dark:ring-gray-800">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">Motor de Ventas IA (Fallback Router)</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Configura las llaves de acceso a las IAs y el orden de prioridad para balancear Costos vs. Inteligencia.
            </p>

            <form className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Grok API Key (xAI)</label>
                <div className="mt-2">
                  <input type="password" placeholder="xoxb-..." className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Claude API Key (Anthropic)</label>
                <div className="mt-2">
                  <input type="password" placeholder="sk-ant-..." className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">OpenAI API Key (Whisper/GPT)</label>
                <div className="mt-2">
                  <input type="password" placeholder="sk-proj-..." className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700" />
                </div>
              </div>
              
              <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Orden del Enrutador (Fallback Priority)</label>
                <p className="text-xs text-gray-500 mb-3">Si la Prioridad 1 falla o demora, saltará a la Prioridad 2 automáticamente para no perder la venta.</p>
                <div className="flex gap-4">
                  <select className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
                    <option>1. Grok (Más rápido/barato)</option>
                    <option>1. Claude Haiku</option>
                  </select>
                  <select className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
                    <option>2. Claude 3.5 Sonnet (Máxima Inteligencia)</option>
                    <option>2. GPT-4o Mini</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end pt-4">
                <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Guardar Motor IA</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
