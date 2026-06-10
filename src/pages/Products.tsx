

export function Products() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Catálogo de Productos</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Gestiona tus productos y configura las reglas estrictas de IA (Prompts y Datos de Cierre) para cada uno.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg dark:ring-white/10">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Producto</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Precio Promedio</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Reglas de Cierre Configuradas</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado IA</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Editar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  <tr>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">Joggers UrbanFit (3x2)</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">$99.900 COP</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">Nombre, Cédula, Dir, Barrio, Talla, Color</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/20">
                        Prompt Activo
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <a href="#" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                        Configurar IA<span className="sr-only">, Joggers UrbanFit</span>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Editor de Reglas de IA (Simulación de Panel Abierto) */}
      <div className="mt-8 bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Editor de IA: Joggers UrbanFit</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configura el comportamiento del bot para este producto específico.</p>
          </div>
        </div>
        <div className="px-4 py-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Reglas de Cierre */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">1. Reglas Estrictas de Cierre (Datos Obligatorios)</h4>
            <p className="text-xs text-gray-500 mb-4">El bot no liberará el pedido hacia ShopyEasy hasta obtener TODOS estos datos verificados.</p>
            <div className="space-y-3">
              {['Nombre Completo', 'Cédula / DNI', 'Dirección Exacta', 'Barrio / Localidad', 'Talla', 'Color'].map((rule) => (
                <div key={rule} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rule}</span>
                  <button className="text-red-500 hover:text-red-700 text-xs font-semibold">Quitar</button>
                </div>
              ))}
              <button className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors">
                + Añadir Regla de Dato
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg ring-1 ring-blue-500/20">
               <label className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-300">
                 <input type="checkbox" defaultChecked className="rounded border-blue-300 text-blue-600 focus:ring-blue-600" />
                 Validación con Google Maps (Street View)
               </label>
               <p className="text-xs mt-1 text-blue-700 dark:text-blue-400 ml-6">El bot enviará una foto de la fachada para confirmar la dirección.</p>
            </div>
          </div>

          {/* Prompt Maestro */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">2. Prompt Maestro (Tono y Objeciones)</h4>
            <textarea 
              rows={12}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white font-mono text-xs"
              defaultValue={`ERES UN ASESOR DE VENTAS EXPERTO USANDO LA METODOLOGÍA DE JUANMA GAVIRIA (Vende todo chateando - 5C).
              
OBJETIVO: Vender los Joggers UrbanFit (Promoción 3x2 a $99.900 COP).
TONO: Coloquial colombiano, empático, sin parecer un robot. Usa notas de voz simuladas si es posible. NUNCA USES BOTONES.

OBJECIONES PRINCIPALES:
- "Está muy caro": Haz énfasis en que son 3 unidades, salen a $33.300 c/u, tela antifluido.
- "Pago contra entrega": Sí, paga cuando reciba en la puerta de su casa.

INSTRUCCIONES DE CIERRE:
Una vez el cliente diga "Sí los quiero", empieza a recolectar las variables de las [Reglas de Cierre] una a una, como en una conversación natural. No mandes formularios.`}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700">Cancelar</button>
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Guardar IA y Reglas</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
