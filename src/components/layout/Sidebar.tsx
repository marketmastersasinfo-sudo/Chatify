
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Settings, MessageSquare, DollarSign, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

const navigation = [
  { name: 'Dashboard Global', href: '/', icon: LayoutDashboard },
  { name: 'Catálogo de Productos', href: '/products', icon: ShoppingBag },
  { name: 'Mis Tiendas', href: '/stores', icon: MapPin },
  { name: 'Finanzas', href: '/finance', icon: DollarSign },
  { name: 'Chats e IA', href: '/chats', icon: MessageSquare },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Chatify</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto px-4 pt-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    isActive
                      ? 'bg-gray-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400',
                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors duration-200'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
