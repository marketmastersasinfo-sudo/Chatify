import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, MapPin, Settings, Truck, ThumbsUp, Database, Megaphone, RefreshCcw, ShoppingCart } from 'lucide-react';
import { cn } from '../../utils/cn';

const navigation = [
  { name: 'Dashboard Central', href: '/', icon: LayoutDashboard },
  { name: 'CRM Ventas WA', href: '/crm-sales', icon: MessageSquare },
  { name: 'CRM Redes Sociales', href: '/crm-social', icon: ThumbsUp },
  { name: 'Logística ShopyEasy', href: '/crm-logistics', icon: Truck },
  { name: 'Remarketing (Carritos)', href: '/crm-remarketing-carts', icon: ShoppingCart },
  { name: 'Remarketing (Chats WA)', href: '/crm-remarketing-wa', icon: RefreshCcw },
  { name: 'Base de Datos', href: '/database', icon: Database },
  { name: 'Difusión Masiva', href: '/broadcast', icon: Megaphone },
  { name: 'Organización Multitienda', href: '/stores', icon: MapPin },
  { name: 'Configuración Global', href: '/settings', icon: Settings },
];

export function Sidebar() {
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
        </ul>
      </nav>
    </div>
  );
}
