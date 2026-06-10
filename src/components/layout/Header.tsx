import { Bell, Search, AlertCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1 items-center" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">Buscar</label>
          <Search className="pointer-events-none absolute left-0 h-5 w-5 text-gray-400" aria-hidden="true" />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm bg-transparent"
            placeholder="Buscar contactos, pedidos, tiendas..."
            type="search"
            name="search"
          />
        </form>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button
            type="button"
            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 flex items-center gap-2 transition-all border border-red-200"
            title="Pausar todas las interacciones de IA"
          >
            <AlertCircle className="h-4 w-4" />
            Botón de Pánico
          </button>
          <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 transition-colors">
            <span className="sr-only">Ver notificaciones</span>
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />
          <div className="flex items-center gap-x-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
            <img
              className="h-8 w-8 rounded-full bg-gray-50 object-cover ring-2 ring-white"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="Admin"
            />
            <span className="hidden lg:flex lg:items-center">
              <span className="text-sm font-semibold leading-6 text-gray-700" aria-hidden="true">
                Usuario Admin
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
