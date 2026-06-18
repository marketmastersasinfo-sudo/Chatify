import { Bell, Search, AlertCircle, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export function Header() {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length > 0) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: true });
    }
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <form className="relative flex flex-1 items-center" onSubmit={handleSearch}>
          <label htmlFor="search-field" className="sr-only">Buscar</label>
          <Search className="pointer-events-none absolute left-0 h-5 w-5 text-gray-400" aria-hidden="true" />
          <input
            ref={inputRef}
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm bg-transparent"
            placeholder="Buscar por nombre, celular, producto, guía..."
            type="search"
            name="search"
            value={query}
            onChange={handleChange}
            autoComplete="off"
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
          
          {/* User Menu with Dropdown */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <img
                className="h-8 w-8 rounded-full bg-gray-50 object-cover ring-2 ring-white"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Admin"
              />
              <span className="hidden lg:flex lg:items-center gap-1">
                <span className="text-sm font-semibold leading-6 text-gray-700" aria-hidden="true">
                  {user?.email?.split('@')[0] || 'Usuario'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Sesión iniciada como</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.email || 'admin'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
