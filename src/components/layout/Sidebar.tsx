import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, MapPin, Settings, Truck, ThumbsUp, Database, Megaphone, RefreshCcw, ShoppingCart, Search, Users, ShoppingBag, GitMerge } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../lib/auth';

const navigation = [
  { name: 'Dashboard Central', href: '/', icon: LayoutDashboard },
  { name: '🔍 Buscador Global', href: '/search', icon: Search },
  { name: 'CRM Ventas WA', href: '/crm-sales', icon: MessageSquare },
  { name: 'CRM Redes Sociales', href: '/crm-social', icon: ThumbsUp },
  { name: 'Logística ShopyEasy', href: '/crm-logistics', icon: Truck },
  { name: 'Remarketing (Carritos)', href: '/crm-remarketing-carts', icon: ShoppingCart },
  { name: 'Remarketing (Chats WA)', href: '/crm-remarketing-wa', icon: RefreshCcw },
  { name: 'Base de Datos', href: '/database', icon: Database },
  { name: 'Difusión Masiva', href: '/broadcast', icon: Megaphone },
  { name: 'Catálogo de Productos', href: '/products', icon: ShoppingBag },
  { name: 'Plantillas de Embudos', href: '/funnels', icon: GitMerge },
  { name: 'Organización Multitienda', href: '/stores', icon: MapPin },
  { name: 'Gestor de Plantillas Meta', href: '/templates', icon: MessageSquare },
  { name: 'Configuración Global', href: '/settings', icon: Settings },
];


export function Sidebar() {
  const { isAdmin } = useAuth();
  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">Chatify</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto px-4 pt-6">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    isActive
                      ? 'bg-blue-50/50 text-blue-600 shadow-sm ring-1 ring-blue-500/10'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600',
                    'group flex gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 transition-all duration-200'
                  )
                }
              >
                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", 'text-inherit')} aria-hidden="true" />
                {item.name}
              </NavLink>
            </li>
          ))}
          {isAdmin && (
            <li>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  cn(
                    isActive
                      ? 'bg-green-50/50 text-green-700 shadow-sm ring-1 ring-green-500/10'
                      : 'text-green-600 hover:bg-green-50 hover:text-green-700',
                    'group flex gap-x-3 rounded-xl p-3 text-sm font-bold leading-6 transition-all duration-200 mt-4 border border-green-100'
                  )
                }
              >
                <Users className={cn("h-5 w-5 shrink-0 transition-colors", 'text-inherit')} aria-hidden="true" />
                Gestión de Usuarios
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
